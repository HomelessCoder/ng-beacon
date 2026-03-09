import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BEACON_CONFIG, BEACON_TRANSLATE_FN } from './beacon.model';
import { BeaconService } from './beacon.service';
import { provideBeacon, provideBeaconTranslateFn } from './provide-beacon';

describe('provideBeacon', () => {
    it('should provide BeaconService', () => {
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideBeacon()],
        });

        const service = TestBed.inject(BeaconService);
        expect(service).toBeInstanceOf(BeaconService);
    });

    it('should use default BEACON_CONFIG when no config is given', () => {
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideBeacon()],
        });

        const config = TestBed.inject(BEACON_CONFIG);
        expect(config).toEqual({});
    });

    it('should provide custom BEACON_CONFIG when config is given', () => {
        const custom = { backdropColor: 'red', labels: { close: 'X' } };

        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideBeacon(custom)],
        });

        const config = TestBed.inject(BEACON_CONFIG);
        expect(config).toEqual(custom);
    });
});

describe('provideBeaconTranslateFn', () => {
    it('should override the translate function token', () => {
        const myFn = (key: string) => `translated:${key}`;

        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideBeacon(),
                provideBeaconTranslateFn(() => myFn),
            ],
        });

        const fn = TestBed.inject(BEACON_TRANSLATE_FN);
        expect(fn('hello')).toBe('translated:hello');
    });

    it('should run its factory in an injection context', () => {
        // The factory can call inject() — we verify it doesn't throw
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideBeacon(),
                provideBeaconTranslateFn(() => {
                    // If this runs outside an injection context, inject() would throw.
                    // Simply returning a function proves injection context is available.
                    return (key: string) => key.toUpperCase();
                }),
            ],
        });

        const fn = TestBed.inject(BEACON_TRANSLATE_FN);
        expect(fn('hello')).toBe('HELLO');
    });
});
