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

    // ── Context Step Registry ───────────────────────────────────────

    describe('context step registry', () => {
        const stepsA: BeaconStep[] = [centerStep('a1'), centerStep('a2')];
        const stepsB: BeaconStep[] = [centerStep('b1')];

        it('should start with an empty registry', () => {
            expect(service.getContextSteps()).toEqual([]);
        });

        it('should register step arrays', () => {
            service.registerContextSteps(stepsA);

            expect(service.getContextSteps().map(s => s.id)).toEqual(['a1', 'a2']);
        });

        it('should flatten multiple registrations', () => {
            service.registerContextSteps(stepsA);
            service.registerContextSteps(stepsB);

            expect(service.getContextSteps().map(s => s.id)).toEqual(['a1', 'a2', 'b1']);
        });

        it('should unregister by exact reference', () => {
            service.registerContextSteps(stepsA);
            service.registerContextSteps(stepsB);
            service.unregisterContextSteps(stepsA);

            expect(service.getContextSteps().map(s => s.id)).toEqual(['b1']);
        });

        it('should handle unregistering an unknown reference gracefully', () => {
            service.registerContextSteps(stepsA);
            service.unregisterContextSteps(stepsB); // never registered

            expect(service.getContextSteps().map(s => s.id)).toEqual(['a1', 'a2']);
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
});
