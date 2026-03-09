# ng-beacon

Lightweight guided-tour library for Angular 19+ (zoneless-compatible).  
SVG spotlight overlays, signal-based state, keyboard navigation, and i18n — zero external dependencies beyond Angular.

[![CI](https://github.com/HomelessCoder/ng-beacon/actions/workflows/ci.yml/badge.svg)](https://github.com/HomelessCoder/ng-beacon/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/ng-beacon)](https://www.npmjs.com/package/ng-beacon)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Signal-based** — reactive state via Angular Signals, fully OnPush / zoneless compatible
- **SVG spotlight** — smooth cutout mask highlights the target element
- **Keyboard support** — Escape to close, focus trapping in the tooltip
- **i18n ready** — plug in any translation function (ngx-translate, Transloco, etc.)
- **Theming** — CSS custom properties for colors, radius, shadow, width
- **Tiny footprint** — no Material, no CDK, no extra runtime deps

## Quick Start

### 1. Install

```bash
npm install ng-beacon
```

### 2. Provide

```ts
// app.config.ts
import { provideBeacon } from 'ng-beacon';

export const appConfig = {
  providers: [
    provideBeacon(),
  ],
};
```

### 3. Add the overlay

```html
<!-- app.component.html -->
@if (beaconService.isActive()) {
  <beacon-overlay />
}
```

```ts
// app.component.ts
import { BeaconOverlay, BeaconService } from 'ng-beacon';

@Component({
  imports: [BeaconOverlay],
  // ...
})
export class AppComponent {
  readonly beaconService = inject(BeaconService);
}
```

### 4. Define steps

```ts
import { BeaconStep } from 'ng-beacon';

export const MY_TOUR: BeaconStep[] = [
  {
    id: 'welcome',
    title: 'Welcome!',
    content: 'Let me show you around.',
    position: 'center',
    showWithoutTarget: true,
  },
  {
    id: 'sidebar',
    title: 'Sidebar',
    content: 'Navigate between sections here.',
    position: 'end',
    selector: '[data-tour="sidebar"]',
  },
];
```

### 5. Start the tour

```ts
this.beaconService.start(MY_TOUR);
```

## Component-Scoped Step Registration

Register steps that are only available while a component is alive:

```ts
import { registerTourSteps } from 'ng-beacon';

@Component({ /* ... */ })
export class DashboardComponent {
  private readonly _tour = registerTourSteps(DASHBOARD_STEPS);
}
```

Then start a context-aware tour from anywhere:

```ts
const steps = this.beaconService.getContextSteps();
this.beaconService.start(steps);
```

## Translation (i18n)

```ts
import { provideBeacon, provideBeaconTranslateFn } from 'ng-beacon';

providers: [
  provideBeacon({
    labels: { close: 'tour.close', nextStep: 'tour.next', prevStep: 'tour.back' },
  }),
  provideBeaconTranslateFn(() => {
    const translate = inject(TranslateService);
    return (key: string) => translate.instant(key);
  }),
]
```

## Theming

Override CSS custom properties on `beacon-overlay` or any ancestor:

```css
beacon-overlay {
  --beacon-bg: #1e1e2e;
  --beacon-text: #cdd6f4;
  --beacon-primary: #89b4fa;
  --beacon-primary-hover: #74c7ec;
  --beacon-radius: 16px;
  --beacon-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  --beacon-width: 360px;
}
```

## API

### `BeaconService`

| Signal / Method | Description |
|---|---|
| `isActive()` | Whether a tour is running |
| `currentStep()` | Current `BeaconStep` or `null` |
| `currentStepIndex()` | Zero-based index or `null` |
| `totalSteps()` | Number of steps (0 when idle) |
| `isFirstStep()` / `isLastStep()` | Position booleans |
| `start(steps)` | Start a tour (filters invisible steps, translates text) |
| `next()` / `prev()` | Navigate; stops tour at boundaries |
| `stop()` | End the tour |
| `getContextSteps()` | All currently registered context steps |
| `registerContextSteps(steps)` | Add steps to the registry |
| `unregisterContextSteps(steps)` | Remove steps from the registry |

### `BeaconStep`

```ts
interface BeaconStep {
  id: string;
  title: string;
  content: string;
  position: 'above' | 'below' | 'start' | 'end' | 'center';
  selector?: string;
  showWithoutTarget?: boolean;
}
```

## Keyboard Support

| Key | Action |
|---|---|
| `Escape` | Stop the tour |

## Development

```bash
npm install
npm test            # run tests (ChromeHeadless, coverage enforced)
npm run build       # build the library
```

## License

[MIT](LICENSE)
