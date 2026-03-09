import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';

import { BEACON_CONFIG, BEACON_TRANSLATE_FN, BeaconConfig, BeaconTranslateFn } from './beacon.model';
import { BeaconService } from './beacon.service';

/**
 * Provide the beacon tour infrastructure.
 *
 * Call this in your application's `providers` array:
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideBeacon({ backdropColor: 'rgba(0,0,0,0.6)' }),
 *   ],
 * });
 * ```
 */
export function provideBeacon(config?: BeaconConfig): EnvironmentProviders {
    return makeEnvironmentProviders([
        BeaconService,
        ...(config ? [{ provide: BEACON_CONFIG, useValue: config }] : []),
    ]);
}

/**
 * Provide a custom translation function for the beacon tour.
 *
 * The factory runs in an injection context, so you can use `inject()` inside it.
 *
 * ```ts
 * providers: [
 *   provideBeacon(),
 *   provideBeaconTranslateFn(() => {
 *       const ts = inject(TranslateService);
 *       return (key: string) => ts.instant(key);
 *   }),
 * ]
 * ```
 */
export function provideBeaconTranslateFn(factory: () => BeaconTranslateFn): Provider {
    return { provide: BEACON_TRANSLATE_FN, useFactory: factory };
}
