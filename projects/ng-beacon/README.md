# ng-beacon

Lightweight guided-tour library for Angular 19+ with Angular Signals and zoneless-compatible rendering.  
SVG spotlight overlays, keyboard navigation, and lightweight i18n hooks with zero runtime dependencies beyond Angular.

Animated demo: [View the GitHub README demo](https://github.com/HomelessCoder/ng-beacon#readme) or [open the GIF directly](https://github.com/HomelessCoder/ng-beacon/blob/main/assets/output.gif).

## Install

```bash
npm install ng-beacon
```

## Quick Start

```ts
// app.config.ts
import { provideBeacon } from 'ng-beacon';

export const appConfig = {
  providers: [provideBeacon()],
};
```

```html
<!-- app.component.html -->
@if (beaconService.isActive()) {
  <beacon-overlay />
}
```

```ts
// Define steps
const TOUR: BeaconStep[] = [
  { id: 'welcome', title: 'Welcome!', content: 'Let me show you around.', position: 'center', showWithoutTarget: true },
  { id: 'nav', title: 'Navigation', content: 'Use the sidebar to navigate.', position: 'end', selector: '[data-tour="sidebar"]' },
];

// Start a tour directly (snapshot — steps are fixed for the tour's lifetime)
this.beaconService.start(TOUR);

// Or start from all registered context steps (reactive — steps from
// destroyed components are automatically pruned from the running tour)
this.beaconService.startContextTour();
```

### Component-scoped step registration

Components can register steps that are automatically added to and removed from the context registry:

```ts
import { registerTourSteps, BeaconStep } from 'ng-beacon';

const MY_STEPS: BeaconStep[] = [
  { id: 'feature', title: 'New Feature', content: 'Check this out!', position: 'below', selector: '[data-tour="feature"]' },
];

@Component({ /* ... */ })
export class FeatureComponent {
  private readonly _tour = registerTourSteps(MY_STEPS); // auto-unregisters on destroy
}
```

When a component with registered steps is destroyed during an active context tour, those steps are automatically removed from the running tour and the step index adjusts accordingly.

If your app uses Angular Router and you want tours to close after route changes, subscribe to `NavigationEnd` and call `beaconService.stop()` from app-level code.

See the [full documentation](https://github.com/HomelessCoder/ng-beacon#readme) for i18n, theming, component-scoped registration, and API reference.

Keyboard support includes `Escape` to close, `ArrowLeft` to go back, and `ArrowRight` to advance.

## License

[MIT](https://github.com/HomelessCoder/ng-beacon/blob/main/LICENSE)
