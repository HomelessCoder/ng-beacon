import { TestBed } from '@angular/core/testing';

import { BeaconStep } from './beacon.model';
import { BeaconService } from './beacon.service';
import { provideBeacon, provideBeaconTranslateFn } from './provide-beacon';

/** Helper to create a step that is always visible (no DOM selector needed). */
function centerStep(id: string, title = `Title ${id}`, content = `Content ${id}`): BeaconStep {
    return { id, title, content, position: 'center', showWithoutTarget: true };
}

/** Helper to create a step bound to a CSS selector. */
function selectorStep(id: string, selector: string): BeaconStep {
    return { id, title: `Title ${id}`, content: `Content ${id}`, position: 'below', selector };
}

describe('BeaconService', () => {
    let service: BeaconService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideBeacon()],
        });
        service = TestBed.inject(BeaconService);
    });

    // ── Initial State ───────────────────────────────────────────────

    describe('initial state', () => {
        it('should not be active', () => {
            expect(service.isActive()).toBe(false);
        });

        it('should have null currentStep', () => {
            expect(service.currentStep()).toBeNull();
        });

        it('should have null currentStepIndex', () => {
            expect(service.currentStepIndex()).toBeNull();
        });

        it('should have totalSteps === 0', () => {
            expect(service.totalSteps()).toBe(0);
        });

        it('should have isFirstStep === false', () => {
            expect(service.isFirstStep()).toBe(false);
        });

        it('should have isLastStep === false', () => {
            expect(service.isLastStep()).toBe(false);
        });
    });

    // ── start() ─────────────────────────────────────────────────────

    describe('start()', () => {
        it('should activate the tour', () => {
            service.start([centerStep('s1')]);

            expect(service.isActive()).toBe(true);
        });

        it('should set currentStepIndex to 0', () => {
            service.start([centerStep('s1'), centerStep('s2')]);

            expect(service.currentStepIndex()).toBe(0);
        });

        it('should set the first step as currentStep', () => {
            service.start([centerStep('s1'), centerStep('s2')]);

            expect(service.currentStep()!.id).toBe('s1');
        });

        it('should report totalSteps correctly', () => {
            service.start([centerStep('s1'), centerStep('s2'), centerStep('s3')]);

            expect(service.totalSteps()).toBe(3);
        });

        it('should mark isFirstStep true and isLastStep false for multi-step tour', () => {
            service.start([centerStep('s1'), centerStep('s2')]);

            expect(service.isFirstStep()).toBe(true);
            expect(service.isLastStep()).toBe(false);
        });

        it('should mark both isFirstStep and isLastStep true for single-step tour', () => {
            service.start([centerStep('s1')]);

            expect(service.isFirstStep()).toBe(true);
            expect(service.isLastStep()).toBe(true);
        });

        it('should keep steps with showWithoutTarget even if no matching selector exists', () => {
            service.start([
                { id: 'a', title: 'A', content: 'A', position: 'center', showWithoutTarget: true },
            ]);

            expect(service.totalSteps()).toBe(1);
        });

        it('should filter out steps whose selector does not match a DOM element', () => {
            service.start([
                selectorStep('missing', '#does-not-exist'),
                centerStep('visible'),
            ]);

            expect(service.totalSteps()).toBe(1);
            expect(service.currentStep()!.id).toBe('visible');
        });

        it('should filter out steps with undefined selector and no showWithoutTarget', () => {
            service.start([
                { id: 'no-sel', title: 'T', content: 'C', position: 'above' },
                centerStep('ok'),
            ]);

            expect(service.totalSteps()).toBe(1);
            expect(service.currentStep()!.id).toBe('ok');
        });

        it('should keep steps whose selector matches an existing DOM element', () => {
            const el = document.createElement('div');
            el.id = 'beacon-test-target';
            document.body.appendChild(el);

            try {
                service.start([selectorStep('found', '#beacon-test-target')]);
                expect(service.totalSteps()).toBe(1);
                expect(service.currentStep()!.id).toBe('found');
            } finally {
                el.remove();
            }
        });

        it('should translate step titles and content via BeaconTranslateFn', () => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [
                    provideBeacon(),
                    provideBeaconTranslateFn(() => (key: string) => `[${key}]`),
                ],
            });
            const svc = TestBed.inject(BeaconService);

            svc.start([centerStep('t1', 'my.title', 'my.content')]);

            expect(svc.currentStep()!.title).toBe('[my.title]');
            expect(svc.currentStep()!.content).toBe('[my.content]');
        });
    });

    // ── next() ──────────────────────────────────────────────────────

    describe('next()', () => {
        it('should advance to the next step', () => {
            service.start([centerStep('s1'), centerStep('s2'), centerStep('s3')]);
            service.next();

            expect(service.currentStepIndex()).toBe(1);
            expect(service.currentStep()!.id).toBe('s2');
        });

        it('should update isFirstStep / isLastStep on middle step', () => {
            service.start([centerStep('s1'), centerStep('s2'), centerStep('s3')]);
            service.next();

            expect(service.isFirstStep()).toBe(false);
            expect(service.isLastStep()).toBe(false);
        });

        it('should stop the tour when called on the last step', () => {
            service.start([centerStep('s1'), centerStep('s2')]);
            service.next(); // now on last step
            service.next(); // should stop

            expect(service.isActive()).toBe(false);
            expect(service.currentStep()).toBeNull();
            expect(service.currentStepIndex()).toBeNull();
        });

        it('should reset to idle when called while not active', () => {
            service.next();

            expect(service.isActive()).toBe(false);
            expect(service.totalSteps()).toBe(0);
        });
    });

    // ── prev() ──────────────────────────────────────────────────────

    describe('prev()', () => {
        it('should go back to the previous step', () => {
            service.start([centerStep('s1'), centerStep('s2'), centerStep('s3')]);
            service.next();
            service.next(); // index 2
            service.prev();

            expect(service.currentStepIndex()).toBe(1);
            expect(service.currentStep()!.id).toBe('s2');
        });

        it('should stop the tour when called on the first step', () => {
            service.start([centerStep('s1'), centerStep('s2')]);
            service.prev(); // on first step → stop

            expect(service.isActive()).toBe(true);
            expect(service.currentStep()).toEqual(centerStep('s1'));
        });

        it('should reset to idle when called while not active', () => {
            service.prev();

            expect(service.isActive()).toBe(false);
            expect(service.totalSteps()).toBe(0);
        });
    });

    // ── stop() ──────────────────────────────────────────────────────

    describe('stop()', () => {
        it('should deactivate the tour', () => {
            service.start([centerStep('s1')]);
            service.stop();

            expect(service.isActive()).toBe(false);
        });

        it('should reset all computed signals to idle defaults', () => {
            service.start([centerStep('s1'), centerStep('s2')]);
            service.next();
            service.stop();

            expect(service.currentStep()).toBeNull();
            expect(service.currentStepIndex()).toBeNull();
            expect(service.totalSteps()).toBe(0);
            expect(service.isFirstStep()).toBe(false);
            expect(service.isLastStep()).toBe(false);
        });

        it('should be safe to call while already idle', () => {
            service.stop();
            expect(service.isActive()).toBe(false);
        });
    });

    // ── startContextTour() ─────────────────────────────────────────

    describe('startContextTour()', () => {
        const stepsA: BeaconStep[] = [centerStep('a1'), centerStep('a2')];
        const stepsB: BeaconStep[] = [centerStep('b1')];

        it('should start a tour from all registered context steps', () => {
            service.registerContextSteps(stepsA);
            service.registerContextSteps(stepsB);
            service.startContextTour();

            expect(service.isActive()).toBe(true);
            expect(service.totalSteps()).toBe(3);
            expect(service.currentStep()!.id).toBe('a1');
        });

        it('should filter and translate steps like start()', () => {
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [
                    provideBeacon(),
                    provideBeaconTranslateFn(() => (key: string) => `[${key}]`),
                ],
            });
            const svc = TestBed.inject(BeaconService);

            svc.registerContextSteps([centerStep('t1', 'my.title', 'my.content')]);
            svc.startContextTour();

            expect(svc.currentStep()!.title).toBe('[my.title]');
            expect(svc.currentStep()!.content).toBe('[my.content]');
        });

        it('should stay idle when no steps are registered', () => {
            service.startContextTour();

            expect(service.isActive()).toBe(false);
            expect(service.totalSteps()).toBe(0);
        });
    });

    // ── Context Step Registry ───────────────────────────────────────

    describe('context step registry', () => {
        const stepsA: BeaconStep[] = [centerStep('a1'), centerStep('a2')];
        const stepsB: BeaconStep[] = [centerStep('b1')];

        it('should register and unregister step arrays', () => {
            service.registerContextSteps(stepsA);
            service.registerContextSteps(stepsB);
            service.startContextTour();

            expect(service.totalSteps()).toBe(3);

            service.stop();
            service.unregisterContextSteps(stepsA);
            service.startContextTour();

            expect(service.totalSteps()).toBe(1);
            expect(service.currentStep()!.id).toBe('b1');
        });

        it('should handle unregistering an unknown reference gracefully', () => {
            service.registerContextSteps(stepsA);
            service.unregisterContextSteps(stepsB); // never registered

            service.startContextTour();
            expect(service.totalSteps()).toBe(2);
        });
    });

    // ── Active tour pruning on unregister ───────────────────────────

    describe('active tour pruning on unregister', () => {
        const stepsA: BeaconStep[] = [centerStep('a1'), centerStep('a2')];
        const stepsB: BeaconStep[] = [centerStep('b1'), centerStep('b2')];
        const stepsC: BeaconStep[] = [centerStep('c1')];

        it('should remove unregistered steps from the active tour', () => {
            service.registerContextSteps(stepsA);
            service.registerContextSteps(stepsB);
            service.startContextTour();

            expect(service.totalSteps()).toBe(4);

            service.unregisterContextSteps(stepsA);

            expect(service.isActive()).toBe(true);
            expect(service.totalSteps()).toBe(2);
            expect(service.currentStep()!.id).toBe('b1');
        });

        it('should clamp currentStepIndex when current step is removed', () => {
            service.registerContextSteps(stepsA);
            service.registerContextSteps(stepsB);
            service.startContextTour();

            // Advance to step b1 (index 2)
            service.next();
            service.next();
            expect(service.currentStep()!.id).toBe('b1');

            // Remove group B — current step is gone
            service.unregisterContextSteps(stepsB);

            expect(service.isActive()).toBe(true);
            expect(service.totalSteps()).toBe(2);
            // Index should clamp to last available step (index 1)
            expect(service.currentStepIndex()).toBe(1);
            expect(service.currentStep()!.id).toBe('a2');
        });

        it('should auto-stop the tour when all steps are removed', () => {
            service.registerContextSteps(stepsA);
            service.startContextTour();

            expect(service.isActive()).toBe(true);

            service.unregisterContextSteps(stepsA);

            expect(service.isActive()).toBe(false);
            expect(service.totalSteps()).toBe(0);
            expect(service.currentStep()).toBeNull();
        });

        it('should be a no-op on state when unregistering while tour is idle', () => {
            service.registerContextSteps(stepsA);
            service.unregisterContextSteps(stepsA);

            expect(service.isActive()).toBe(false);
            expect(service.totalSteps()).toBe(0);
        });

        it('should not affect a tour started with start() directly', () => {
            service.registerContextSteps(stepsA);
            service.start([centerStep('d1'), centerStep('d2')]);

            expect(service.totalSteps()).toBe(2);

            service.unregisterContextSteps(stepsA);

            // Tour started via start() is a snapshot — unaffected
            expect(service.totalSteps()).toBe(2);
            expect(service.currentStep()!.id).toBe('d1');
        });

        it('should preserve step order after partial unregister', () => {
            service.registerContextSteps(stepsA);
            service.registerContextSteps(stepsB);
            service.registerContextSteps(stepsC);
            service.startContextTour();

            // Remove middle group
            service.unregisterContextSteps(stepsB);

            expect(service.totalSteps()).toBe(3);

            // Walk through remaining steps to verify order
            expect(service.currentStep()!.id).toBe('a1');
            service.next();
            expect(service.currentStep()!.id).toBe('a2');
            service.next();
            expect(service.currentStep()!.id).toBe('c1');
        });
    });

    // ── recalculate() ─────────────────────────────────────────────

    describe('recalculate()', () => {
        const stepsA: readonly BeaconStep[] = [centerStep('a1'), centerStep('a2')];

        it('should add newly visible steps after recalculate', () => {
            const el = document.createElement('div');
            el.className = 'late-step';

            const stepsWithSelector: readonly BeaconStep[] = [
                selectorStep('s1', '.late-step'),
            ];

            service.registerContextSteps(stepsA);
            service.registerContextSteps(stepsWithSelector);
            service.startContextTour();

            // s1 is not in the DOM yet — only stepsA are active
            expect(service.totalSteps()).toBe(2);

            // Add element to the DOM and recalculate
            document.body.appendChild(el);
            service.recalculate();

            expect(service.totalSteps()).toBe(3);
            expect(service.currentStep()!.id).toBe('a1');

            el.remove();
        });

        it('should preserve current step by id when steps are added before it', () => {
            const el = document.createElement('div');
            el.className = 'early-step';

            // Register a group whose selector is not yet in DOM — it will appear *before* stepsA
            const earlySteps: readonly BeaconStep[] = [
                selectorStep('e1', '.early-step'),
            ];

            service.registerContextSteps(earlySteps);
            service.registerContextSteps(stepsA);
            service.startContextTour();

            // Only stepsA visible, navigate to a2
            expect(service.totalSteps()).toBe(2);
            service.next();
            expect(service.currentStep()!.id).toBe('a2');

            // Make earlySteps visible and recalculate
            document.body.appendChild(el);
            service.recalculate();

            expect(service.totalSteps()).toBe(3);
            // Current step is still a2, now at index 2
            expect(service.currentStep()!.id).toBe('a2');
            expect(service.currentStepIndex()).toBe(2);

            el.remove();
        });

        it('should clamp index when current step becomes invisible', () => {
            const el = document.createElement('div');
            el.className = 'vanishing';
            document.body.appendChild(el);

            const vanishingSteps: readonly BeaconStep[] = [
                selectorStep('v1', '.vanishing'),
            ];

            service.registerContextSteps(stepsA);
            service.registerContextSteps(vanishingSteps);
            service.startContextTour();

            // Navigate to v1 (index 2)
            service.next();
            service.next();
            expect(service.currentStep()!.id).toBe('v1');

            // Remove the element and recalculate — v1 is now invisible
            el.remove();
            service.recalculate();

            expect(service.totalSteps()).toBe(2);
            // Clamped to last step (a2)
            expect(service.currentStepIndex()).toBe(1);
            expect(service.currentStep()!.id).toBe('a2');
        });

        it('should auto-stop when all steps become invisible', () => {
            const el = document.createElement('div');
            el.className = 'only-step';
            document.body.appendChild(el);

            const selectorSteps: readonly BeaconStep[] = [
                selectorStep('o1', '.only-step'),
            ];

            service.registerContextSteps(selectorSteps);
            service.startContextTour();

            expect(service.isActive()).toBe(true);

            el.remove();
            service.recalculate();

            expect(service.isActive()).toBe(false);
            expect(service.totalSteps()).toBe(0);
        });

        it('should be a no-op when tour is idle', () => {
            service.registerContextSteps(stepsA);
            service.recalculate();

            expect(service.isActive()).toBe(false);
            expect(service.totalSteps()).toBe(0);
        });

        it('should be a no-op for tours started with start()', () => {
            service.start([centerStep('d1'), centerStep('d2')]);
            expect(service.totalSteps()).toBe(2);

            service.recalculate();

            // Unchanged — start() tours are not context tours
            expect(service.totalSteps()).toBe(2);
            expect(service.currentStep()!.id).toBe('d1');
        });
    });

    // ── Full tour walkthrough ───────────────────────────────────────

    describe('full walkthrough', () => {
        it('should navigate through all steps then stop', () => {
            service.start([centerStep('w1'), centerStep('w2'), centerStep('w3')]);

            expect(service.currentStep()!.id).toBe('w1');
            expect(service.isFirstStep()).toBe(true);

            service.next();
            expect(service.currentStep()!.id).toBe('w2');
            expect(service.isFirstStep()).toBe(false);
            expect(service.isLastStep()).toBe(false);

            service.next();
            expect(service.currentStep()!.id).toBe('w3');
            expect(service.isLastStep()).toBe(true);

            service.next(); // end
            expect(service.isActive()).toBe(false);
        });
    });

    // ── Tour Events (finished / dismissed) ──────────────────────────

    describe('tour events', () => {
        describe('initial state', () => {
            it('should have finished as null', () => {
                expect(service.finished()).toBeNull();
            });

            it('should have dismissed as null', () => {
                expect(service.dismissed()).toBeNull();
            });
        });

        describe('finished', () => {
            it('should emit when next() is called on the last step', () => {
                service.start([centerStep('s1'), centerStep('s2')]);
                service.next(); // move to s2 (last step)
                service.next(); // finish

                const event = service.finished();
                expect(event).not.toBeNull();
                expect(event!.step.id).toBe('s2');
                expect(event!.stepIndex).toBe(1);
                expect(event!.totalSteps).toBe(2);
            });

            it('should not emit on regular next() calls (mid-tour)', () => {
                service.start([centerStep('s1'), centerStep('s2'), centerStep('s3')]);
                service.next(); // move to s2

                expect(service.finished()).toBeNull();
            });

            it('should not emit when next() is called while idle', () => {
                service.next();

                expect(service.finished()).toBeNull();
            });

            it('should emit for single-step tour', () => {
                service.start([centerStep('only')]);
                service.next(); // finish

                const event = service.finished();
                expect(event).not.toBeNull();
                expect(event!.step.id).toBe('only');
                expect(event!.stepIndex).toBe(0);
                expect(event!.totalSteps).toBe(1);
            });

            it('should emit a new object on each completion', () => {
                service.start([centerStep('s1')]);
                service.next();
                const first = service.finished();

                service.start([centerStep('s2')]);
                service.next();
                const second = service.finished();

                expect(first).not.toBe(second);
                expect(first!.step.id).toBe('s1');
                expect(second!.step.id).toBe('s2');
            });
        });

        describe('dismissed', () => {
            it('should emit when stop() is called while active', () => {
                service.start([centerStep('s1'), centerStep('s2')]);
                service.next(); // move to s2
                service.stop();

                const event = service.dismissed();
                expect(event).not.toBeNull();
                expect(event!.step.id).toBe('s2');
                expect(event!.stepIndex).toBe(1);
                expect(event!.totalSteps).toBe(2);
            });

            it('should not emit when stop() is called while idle', () => {
                service.stop();

                expect(service.dismissed()).toBeNull();
            });

            it('should emit with step 0 when dismissed immediately', () => {
                service.start([centerStep('s1'), centerStep('s2')]);
                service.stop();

                const event = service.dismissed();
                expect(event).not.toBeNull();
                expect(event!.step.id).toBe('s1');
                expect(event!.stepIndex).toBe(0);
                expect(event!.totalSteps).toBe(2);
            });

            it('should emit when all context steps are unregistered mid-tour', () => {
                const steps: BeaconStep[] = [centerStep('a1'), centerStep('a2')];
                service.registerContextSteps(steps);
                service.startContextTour();
                service.next(); // move to a2

                service.unregisterContextSteps(steps);

                const event = service.dismissed();
                expect(event).not.toBeNull();
                expect(event!.step.id).toBe('a2');
                expect(event!.stepIndex).toBe(1);
                expect(event!.totalSteps).toBe(2);
            });

            it('should emit when recalculate() removes all visible steps', () => {
                const el = document.createElement('div');
                el.className = 'vanish-all';
                document.body.appendChild(el);

                const steps: readonly BeaconStep[] = [selectorStep('v1', '.vanish-all')];
                service.registerContextSteps(steps);
                service.startContextTour();

                expect(service.isActive()).toBe(true);

                el.remove();
                service.recalculate();

                const event = service.dismissed();
                expect(event).not.toBeNull();
                expect(event!.step.id).toBe('v1');
                expect(event!.stepIndex).toBe(0);
                expect(event!.totalSteps).toBe(1);
            });

            it('should emit a new object on each dismissal', () => {
                service.start([centerStep('s1')]);
                service.stop();
                const first = service.dismissed();

                service.start([centerStep('s2')]);
                service.stop();
                const second = service.dismissed();

                expect(first).not.toBe(second);
                expect(first!.step.id).toBe('s1');
                expect(second!.step.id).toBe('s2');
            });
        });

        describe('independence', () => {
            it('should not emit dismissed when tour is finished', () => {
                service.start([centerStep('s1')]);
                service.next(); // finish

                expect(service.finished()).not.toBeNull();
                expect(service.dismissed()).toBeNull();
            });

            it('should not emit finished when tour is dismissed', () => {
                service.start([centerStep('s1')]);
                service.stop();

                expect(service.dismissed()).not.toBeNull();
                expect(service.finished()).toBeNull();
            });
        });
    });
});
