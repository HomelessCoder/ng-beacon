import { TestBed } from '@angular/core/testing';
import {
    BEACON_CONFIG,
    BEACON_TRANSLATE_FN,
    DEFAULT_BEACON_LABELS,
} from './beacon.model';

describe('beacon.model — tokens & defaults', () => {
    describe('DEFAULT_BEACON_LABELS', () => {
        it('should have "Close" as the close label', () => {
            expect(DEFAULT_BEACON_LABELS.close).toBe('Close');
        });

        it('should have "Next step" as the nextStep label', () => {
            expect(DEFAULT_BEACON_LABELS.nextStep).toBe('Next step');
        });

        it('should have "Previous step" as the prevStep label', () => {
            expect(DEFAULT_BEACON_LABELS.prevStep).toBe('Previous step');
        });
    });

    describe('BEACON_TRANSLATE_FN default factory', () => {
        it('should return an identity function', () => {
            TestBed.configureTestingModule({});
            const fn = TestBed.inject(BEACON_TRANSLATE_FN);

            expect(fn('hello')).toBe('hello');
            expect(fn('tour.step1.title')).toBe('tour.step1.title');
            expect(fn('')).toBe('');
        });
    });

    describe('BEACON_CONFIG default factory', () => {
        it('should return an empty object', () => {
            TestBed.configureTestingModule({});
            const config = TestBed.inject(BEACON_CONFIG);

            expect(config).toEqual({});
        });
    });
});
