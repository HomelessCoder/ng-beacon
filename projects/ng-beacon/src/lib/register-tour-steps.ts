import { DestroyRef, inject } from '@angular/core';
import { BeaconStep } from './beacon.model';
import { BeaconService } from './beacon.service';

/**
 * Registers tour steps for the lifetime of the current component.
 * Call as a field initializer — it uses `inject()` under the hood.
 *
 * ```ts
 * export class MyPageComponent {
 *     private readonly _tour = registerTourSteps(MY_PAGE_STEPS);
 * }
 * ```
 */
export function registerTourSteps(steps: readonly BeaconStep[]): void {
    const beacon = inject(BeaconService);
    const destroyRef = inject(DestroyRef);

    // Each component instance needs its own array reference so that
    // unregisterContextSteps (which uses reference equality) only removes
    // this specific registration — not a sibling using the same constant.
    const ref = [...steps] as readonly BeaconStep[];

    beacon.registerContextSteps(ref);
    destroyRef.onDestroy(() => beacon.unregisterContextSteps(ref));
}
