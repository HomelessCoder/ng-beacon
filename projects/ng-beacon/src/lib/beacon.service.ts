import { computed, inject, Injectable, signal } from "@angular/core";
import { BEACON_TRANSLATE_FN, BeaconState, BeaconStep } from "./beacon.model";

@Injectable()
export class BeaconService {
    private readonly translateFn = inject(BEACON_TRANSLATE_FN);
    private readonly state = signal<BeaconState>({ status: 'idle', steps: [], currentStepIndex: 0 });
    private readonly registry = signal<ReadonlyArray<readonly BeaconStep[]>>([]);

    /**
     * Maps each source registration array to its translated steps in the active tour.
     * Populated by `startContextTour()`, consulted by `unregisterContextSteps()`.
     */
    private readonly groupStepMap = new Map<readonly BeaconStep[], BeaconStep[]>();
    private contextTourActive = false;

    /** Whether a tour is currently running. */
    readonly isActive = computed(() => this.state().status === 'active');

    /** The currently active step, or `null` if no tour is running. */
    readonly currentStep = computed(() => {
        const state = this.state();

        if (state.status === 'active') {
            return state.steps[state.currentStepIndex];
        }

        return null;
    });

    /** Whether the current step is the first step in the tour. */
    readonly isFirstStep = computed(() => {
        const state = this.state();

        return state.status === 'active' && state.currentStepIndex === 0;
    });

    /** Whether the current step is the last step in the tour. */
    readonly isLastStep = computed(() => {
        const state = this.state();

        return state.status === 'active' && state.currentStepIndex === state.steps.length - 1;
    });

    /** Total number of steps in the active tour, or `0` if no tour is running. */
    readonly totalSteps = computed(() => {
        const state = this.state();

        return state.status === 'active' ? state.steps.length : 0;
    });

    /** Zero-based index of the current step, or `null` if no tour is running. */
    readonly currentStepIndex = computed(() => {
        const state = this.state();

        if (state.status === 'active') {
            return state.currentStepIndex;
        }

        return null;
    });

    /**
     * Start a tour with the given steps.
     * Steps whose target element is not currently in the DOM are filtered out
     * (unless `showWithoutTarget` is set). Step titles and content are translated
     * via the configured `BeaconTranslateFn`.
     */
    start(steps: BeaconStep[]) {
        this.contextTourActive = false;
        this.groupStepMap.clear();
        const translated = steps
            .filter(this.isStepVisible.bind(this))
            .map(step => ({
                ...step,
                title: this.translateFn(step.title),
                content: this.translateFn(step.content),
            }));
        this.state.set({ status: 'active', steps: translated, currentStepIndex: 0 });
    }

    /** Advance to the next step. If already on the last step, the tour is stopped. */
    next() {
        this.state.update(state => {
            if (state.status !== 'active') {
                return { ...state, status: 'idle', steps: [], currentStepIndex: 0 };
            }

            if (state.currentStepIndex >= state.steps.length - 1) {
                return { ...state, status: 'idle', steps: [], currentStepIndex: 0 };
            }

            return { ...state, currentStepIndex: state.currentStepIndex + 1 };
        });
    }

    /** Go back to the previous step. */
    prev() {
        this.state.update(state => {
            if (state.status !== 'active' || state.currentStepIndex <= 0) {
                return { ...state, currentStepIndex: 0 };
            }

            return { ...state, currentStepIndex: state.currentStepIndex - 1 };
        });
    }

    /** Stop the tour and reset all state. */
    stop() {
        this.state.set({ status: 'idle', steps: [], currentStepIndex: 0 });
        this.groupStepMap.clear();
        this.contextTourActive = false;
    }

    /**
     * Start a tour from all currently registered context steps.
     * Unlike `start()`, this method tracks which registration group each step
     * came from, so that steps are automatically pruned from the running tour
     * when a component is destroyed and calls `unregisterContextSteps()`.
     */
    startContextTour() {
        this.contextTourActive = true;
        this.rebuildContextTour(null);
    }

    /**
     * Re-evaluate visibility of all registered context steps and rebuild
     * the active tour. The current step is preserved by `id` so that newly
     * visible steps appearing before or after the current position do not
     * cause a jarring jump. No-op when the active tour was not started via
     * `startContextTour()`.
     */
    recalculate() {
        if (!this.contextTourActive) {
            return;
        }

        const currentId = this.currentStep()?.id ?? null;
        this.rebuildContextTour(currentId);
    }

    /**
     * Rebuild the context tour from the registry.
     * @param position - A step `id` to preserve the current position,
     *                   or `null` to start from the beginning.
     */
    private rebuildContextTour(position: string | null) {
        this.groupStepMap.clear();

        const allSteps: BeaconStep[] = [];

        for (const group of this.registry()) {
            const translated = group
                .filter(this.isStepVisible.bind(this))
                .map(step => ({
                    ...step,
                    title: this.translateFn(step.title),
                    content: this.translateFn(step.content),
                }));

            if (translated.length > 0) {
                this.groupStepMap.set(group, translated);
                allSteps.push(...translated);
            }
        }

        let index = 0;
        if (typeof position === 'string') {
            const found = allSteps.findIndex(s => s.id === position);
            index = found >= 0 ? found : Math.min(this.state().currentStepIndex, Math.max(allSteps.length - 1, 0));
        }

        if (allSteps.length === 0) {
            this.contextTourActive = false;
            this.state.set({ status: 'idle', steps: [], currentStepIndex: 0 });
        } else {
            this.state.set({ status: 'active', steps: allSteps, currentStepIndex: index });
        }
    }

    /** Registers a step array. Call from component field initializers via `registerTourSteps()`. */
    registerContextSteps(steps: readonly BeaconStep[]): void {
        this.registry.update(list => [...list, steps]);
    }

    /** Removes a previously registered step array. Called automatically on component destroy. */
    unregisterContextSteps(steps: readonly BeaconStep[]): void {
        this.registry.update(list => list.filter(entry => entry !== steps));

        const groupSteps = this.groupStepMap.get(steps);
        if (!groupSteps) {
            return;
        }

        this.groupStepMap.delete(steps);

        this.state.update(state => {
            if (state.status !== 'active') {
                return state;
            }

            const stepsToRemove = new Set(groupSteps);
            const remaining = state.steps.filter(s => !stepsToRemove.has(s));

            if (remaining.length === 0) {
                return { status: 'idle', steps: [], currentStepIndex: 0 };
            }

            return {
                ...state,
                steps: remaining,
                currentStepIndex: Math.min(state.currentStepIndex, remaining.length - 1),
            };
        });
    }

    private isStepVisible(step: BeaconStep): boolean {
        if (step.showWithoutTarget === true) {
            return true;
        }

        if (step.selector === undefined) {
            return false;
        }

        return !!document.querySelector<HTMLElement>(step.selector);
    }
}
