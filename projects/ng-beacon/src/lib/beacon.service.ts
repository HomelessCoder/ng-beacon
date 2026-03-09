import { computed, DestroyRef, inject, Injectable, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router } from "@angular/router";
import { filter } from "rxjs";
import { BEACON_TRANSLATE_FN, BeaconState, BeaconStep } from "./beacon.model";

@Injectable()
export class BeaconService {
    private readonly destroyRef = inject(DestroyRef);
    private readonly router = inject(Router);
    private readonly translateFn = inject(BEACON_TRANSLATE_FN);
    private readonly state = signal<BeaconState>({ status: 'idle', steps: [], currentStepIndex: 0 });
    private readonly registry = signal<ReadonlyArray<readonly BeaconStep[]>>([]);

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

    constructor() {
        if (!this.router?.events) {
            return;
        }

        this.router.events.pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe(_ => {
            if (!this.isActive()) {
                return;
            }

            this.stop();
        });
    }

    /**
     * Start a tour with the given steps.
     * Steps whose target element is not currently in the DOM are filtered out
     * (unless `showWithoutTarget` is set). Step titles and content are translated
     * via the configured `BeaconTranslateFn`.
     */
    start(steps: BeaconStep[]) {
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

    /** Go back to the previous step. If already on the first step, the tour is stopped. */
    prev() {
        this.state.update(state => {
            if (state.status !== 'active') {
                return { ...state, status: 'idle', steps: [], currentStepIndex: 0 };
            }

            if (state.currentStepIndex <= 0) {
                return { ...state, status: 'idle', steps: [], currentStepIndex: 0 };
            }

            return { ...state, currentStepIndex: state.currentStepIndex - 1 };
        });
    }

    /** Stop the tour and reset all state. */
    stop() {
        this.state.set({ status: 'idle', steps: [], currentStepIndex: 0 });
    }

    /** Returns a flattened array of all currently registered context steps. */
    getContextSteps(): BeaconStep[] {
        return this.registry().flat();
    }

    /** Registers a step array. Call from component field initializers via `registerTourSteps()`. */
    registerContextSteps(steps: readonly BeaconStep[]): void {
        this.registry.update(list => [...list, steps]);
    }

    /** Removes a previously registered step array. Called automatically on component destroy. */
    unregisterContextSteps(steps: readonly BeaconStep[]): void {
        this.registry.update(list => list.filter(entry => entry !== steps));
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
