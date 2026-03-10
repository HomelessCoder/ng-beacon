import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BeaconStep } from './beacon.model';
import { BeaconService } from './beacon.service';
import { provideBeacon } from './provide-beacon';
import { registerTourSteps } from './register-tour-steps';

const STEPS: BeaconStep[] = [
    { id: 'r1', title: 'R1', content: 'Content 1', position: 'center', showWithoutTarget: true },
    { id: 'r2', title: 'R2', content: 'Content 2', position: 'center', showWithoutTarget: true },
];

@Component({ selector: 'test-host', template: '', standalone: true })
class TestHostComponent {
    readonly _tour = registerTourSteps(STEPS);
}

describe('registerTourSteps', () => {
    let service: BeaconService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideBeacon()],
        });
        service = TestBed.inject(BeaconService);
    });

    it('should register steps with BeaconService when the host component is created', () => {
        service.startContextTour();
        expect(service.totalSteps()).toBe(0);
        service.stop();

        const fixture = TestBed.createComponent(TestHostComponent);
        fixture.detectChanges();

        service.startContextTour();
        expect(service.totalSteps()).toBe(2);
        expect(service.currentStep()!.id).toBe('r1');
    });

    it('should unregister steps when the host component is destroyed', () => {
        const fixture = TestBed.createComponent(TestHostComponent);
        fixture.detectChanges();

        service.startContextTour();
        expect(service.totalSteps()).toBe(2);
        service.stop();

        fixture.destroy();

        service.startContextTour();
        expect(service.totalSteps()).toBe(0);
    });

    it('should support multiple components registering concurrently', () => {
        const fixture1 = TestBed.createComponent(TestHostComponent);
        fixture1.detectChanges();
        const fixture2 = TestBed.createComponent(TestHostComponent);
        fixture2.detectChanges();

        service.startContextTour();
        expect(service.totalSteps()).toBe(4);
        service.stop();

        fixture1.destroy();
        service.startContextTour();
        expect(service.totalSteps()).toBe(2);
        service.stop();

        fixture2.destroy();
        service.startContextTour();
        expect(service.totalSteps()).toBe(0);
    });
});
