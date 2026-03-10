/*
 * Public API Surface of ng-beacon
 */

export { BeaconOverlay } from './lib/beacon-overlay/beacon-overlay';
export {
    BEACON_CONFIG,
    BEACON_TRANSLATE_FN,
    DEFAULT_BEACON_LABELS,
    type BeaconConfig,
    type BeaconLabels,
    type BeaconPosition,
    type BeaconStep,
    type BeaconTourEvent,
    type BeaconTranslateFn
} from './lib/beacon.model';
export { BeaconService } from './lib/beacon.service';
export { provideBeacon, provideBeaconTranslateFn } from './lib/provide-beacon';
export { registerTourSteps } from './lib/register-tour-steps';

