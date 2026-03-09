
import { InjectionToken } from '@angular/core';

/** Position of the tooltip relative to the target element. */
export type BeaconPosition = 'above' | 'below' | 'start' | 'end' | 'center';

/**
 * A function that translates a key to a user-visible string.
 * Consumers supply their own implementation (e.g. wrapping ngx-translate).
 * The default identity function returns the key as-is.
 */
export type BeaconTranslateFn = (key: string) => string;

/**
 * DI token for the translation function used by the beacon tour.
 *
 * Defaults to an identity function — keys are displayed verbatim.
 * Override via `provideBeaconTranslateFn()` in your application providers.
 */
export const BEACON_TRANSLATE_FN = new InjectionToken<BeaconTranslateFn>(
    'BEACON_TRANSLATE_FN',
    { factory: () => (key: string) => key },
);

/** Translatable labels for the beacon overlay chrome (buttons, aria-labels). */
export interface BeaconLabels {
    close: string;
    nextStep: string;
    prevStep: string;
}

export const DEFAULT_BEACON_LABELS: BeaconLabels = {
    close: 'Close',
    nextStep: 'Next step',
    prevStep: 'Previous step',
};

/** Global configuration for the beacon tour. */
export interface BeaconConfig {
    /** Override default overlay button / aria-label text (plain text or i18n keys). */
    labels?: Partial<BeaconLabels>;
    /** Backdrop overlay colour. Default: `'rgba(0, 0, 0, 0.5)'` */
    backdropColor?: string;
}

/**
 * DI token for optional beacon configuration.
 * Provide via `provideBeacon({ labels: { close: 'tour.close' } })`.
 */
export const BEACON_CONFIG = new InjectionToken<BeaconConfig>(
    'BEACON_CONFIG',
    { factory: () => ({}) },
);

/** A single step in a guided tour. */
export interface BeaconStep {
    /** Unique identifier for this step. */
    id: string;
    /** Step title — plain text (rendered via text interpolation, HTML is escaped). */
    title: string;
    /** Step content — plain text (rendered via text interpolation, HTML is escaped). */
    content: string;
    /** Tooltip placement relative to the target element. */
    position: BeaconPosition;
    /** CSS selector for the target element. */
    selector?: string;
    /** If true, the step will be shown at the center of the screen, even if the target element is not found in the DOM. Default: false  */
    showWithoutTarget?: boolean;
}

export interface BeaconState {
    status: 'idle' | 'active';
    steps: BeaconStep[];
    currentStepIndex: number;
}