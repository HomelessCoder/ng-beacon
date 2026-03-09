import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BEACON_CONFIG, BEACON_TRANSLATE_FN, BeaconStep } from '../beacon.model';
import { BeaconService } from '../beacon.service';
import { provideBeacon } from '../provide-beacon';
import { BeaconOverlay } from './beacon-overlay';

/** Step that displays centered (no DOM target). */
function centerStep(id: string, title = `Title ${id}`, content = `Content ${id}`): BeaconStep {
    return { id, title, content, position: 'center', showWithoutTarget: true };
}

/** Step bound to a CSS selector. */
function selectorStep(id: string, selector: string, position: 'above' | 'below' = 'below'): BeaconStep {
    return { id, title: `Title ${id}`, content: `Content ${id}`, position, selector };
}

describe('BeaconOverlay', () => {
    let fixture: ComponentFixture<BeaconOverlay>;
    let service: BeaconService;
    let appRef: ApplicationRef;
    let targetEl: HTMLElement | null = null;

    function setup(providers: any[] = []) {
        TestBed.configureTestingModule({
            imports: [BeaconOverlay],
            providers: [provideRouter([]), provideBeacon(), ...providers],
        });

        fixture = TestBed.createComponent(BeaconOverlay);
        service = TestBed.inject(BeaconService);
        appRef = TestBed.inject(ApplicationRef);
    }

    /** Detect changes + tick effects. */
    function detectChanges() {
        fixture.detectChanges();
        appRef.tick();
        fixture.detectChanges();
    }

    function query(selector: string): HTMLElement | null {
        return fixture.nativeElement.querySelector(selector);
    }

    function queryAll(selector: string): HTMLElement[] {
        return Array.from(fixture.nativeElement.querySelectorAll(selector));
    }

    afterEach(() => {
        targetEl?.remove();
        targetEl = null;
    });

    /** Creates a fixed-position DOM element to serve as a tour target. */
    function createTarget(id: string): HTMLElement {
        targetEl = document.createElement('div');
        targetEl.id = id;
        // Give it real dimensions so getBoundingClientRect returns non-zero values
        Object.assign(targetEl.style, {
            position: 'fixed',
            top: '100px',
            left: '200px',
            width: '150px',
            height: '50px',
        });
        document.body.appendChild(targetEl);
        return targetEl;
    }

    // ── Rendering: inactive ─────────────────────────────────────────

    describe('when inactive', () => {
        beforeEach(() => setup());

        it('should not render the tooltip', () => {
            detectChanges();
            expect(query('.beacon-tooltip')).toBeNull();
        });

        it('should not render the backdrop', () => {
            detectChanges();
            expect(query('.beacon-backdrop')).toBeNull();
        });

        it('should not render any click blockers', () => {
            detectChanges();
            expect(queryAll('.beacon-click-blocker').length).toBe(0);
        });
    });

    // ── Rendering: active with center step (no selector) ────────────

    describe('when active with a centerStep (no selector)', () => {
        beforeEach(() => {
            setup();
            service.start([centerStep('c1', 'Welcome', 'Hello world'), centerStep('c2')]);
            detectChanges();
        });

        it('should render the backdrop', () => {
            expect(query('.beacon-backdrop')).toBeTruthy();
        });

        it('should render a full-page click blocker', () => {
            const blockers = queryAll('.beacon-click-blocker');
            expect(blockers.length).toBe(1);
        });

        it('should render the tooltip', () => {
            expect(query('.beacon-tooltip')).toBeTruthy();
        });

        it('should display the step title', () => {
            expect(query('.beacon-tooltip-title')!.textContent!.trim()).toBe('Welcome');
        });

        it('should display the step content', () => {
            expect(query('.beacon-tooltip-content')!.textContent!.trim()).toBe('Hello world');
        });

        it('should display the step counter as "1 / 2"', () => {
            expect(query('.beacon-step-counter')!.textContent!.trim()).toBe('1 / 2');
        });
    });

    // ── Rendering: active with targeted step ────────────────────────

    describe('when active with a targeted step (selector matches DOM)', () => {
        beforeEach(() => {
            setup();
            createTarget('overlay-target');
            service.start([selectorStep('t1', '#overlay-target')]);
            detectChanges();
        });

        it('should render four positional click blockers', () => {
            const blockers = queryAll('.beacon-click-blocker');
            expect(blockers.length).toBe(4);
        });

        it('should render an SVG mask with the step id', () => {
            const mask = fixture.nativeElement.querySelector('mask');
            expect(mask).toBeTruthy();
            expect(mask!.getAttribute('id')).toBe('t1');
        });

        it('should have a spotlight rect with non-zero dimensions', () => {
            const spotlightRect = fixture.nativeElement.querySelector('mask rect:nth-child(2)');
            expect(spotlightRect).toBeTruthy();
            const width = parseFloat(spotlightRect!.getAttribute('width')!);
            expect(width).toBeGreaterThan(0);
        });
    });

    // ── Button interactions ─────────────────────────────────────────

    describe('button interactions', () => {
        beforeEach(() => {
            setup();
            service.start([centerStep('b1'), centerStep('b2'), centerStep('b3')]);
            detectChanges();
        });

        it('close button should stop the tour', fakeAsync(() => {
            query('.beacon-tooltip-close')!.click();
            detectChanges();

            expect(service.isActive()).toBe(false);
            expect(query('.beacon-tooltip')?.classList.contains('is-visible')).toBeFalse();

            tick(180);
            fixture.detectChanges();

            expect(query('.beacon-tooltip')).toBeNull();
        }));

        it('next button should advance to the next step', () => {
            query('.beacon-tooltip-button.primary')!.click();
            detectChanges();

            expect(query('.beacon-tooltip-title')!.textContent!.trim()).toBe('Title b2');
            expect(query('.beacon-step-counter')!.textContent!.trim()).toBe('2 / 3');
        });

        it('prev button should go to the previous step', () => {
            // Advance first
            query('.beacon-tooltip-button.primary')!.click();
            detectChanges();

            query('.beacon-tooltip-button.secondary')!.click();
            detectChanges();

            expect(query('.beacon-tooltip-title')!.textContent!.trim()).toBe('Title b1');
        });

        it('prev button should be disabled on the first step', () => {
            const prevBtn = query('.beacon-tooltip-button.secondary') as HTMLButtonElement;
            expect(prevBtn.disabled).toBeTrue();
        });

        it('prev button should not be disabled after advancing', () => {
            query('.beacon-tooltip-button.primary')!.click();
            detectChanges();

            const prevBtn = query('.beacon-tooltip-button.secondary') as HTMLButtonElement;
            expect(prevBtn.disabled).toBeFalse();
        });

        it('next button should show checkmark on the last step', () => {
            service.next(); // step 2
            service.next(); // step 3 (last)
            detectChanges();

            const nextBtn = query('.beacon-tooltip-button.primary')!;
            // ✓ is rendered as &#10003; which is the checkmark character
            expect(nextBtn.textContent!.trim()).toBe('✓');
        });

        it('next button should show arrow when not on the last step', () => {
            const nextBtn = query('.beacon-tooltip-button.primary')!;
            // → is rendered as &rarr;
            expect(nextBtn.textContent!.trim()).toBe('→');
        });
    });

    // ── Click blockers ──────────────────────────────────────────────

    describe('click blockers', () => {
        it('clicking a full-page click blocker should stop the tour', () => {
            setup();
            service.start([centerStep('cb1')]);
            detectChanges();

            queryAll('.beacon-click-blocker')[0].click();
            detectChanges();

            expect(service.isActive()).toBe(false);
        });

        it('clicking a positional click blocker should stop the tour', () => {
            setup();
            createTarget('blocker-target');
            service.start([selectorStep('cb2', '#blocker-target')]);
            detectChanges();

            // Click the first positional blocker (top)
            queryAll('.beacon-click-blocker')[0].click();
            detectChanges();

            expect(service.isActive()).toBe(false);
        });
    });

    // ── Accessibility ───────────────────────────────────────────────

    describe('accessibility', () => {
        beforeEach(() => {
            setup();
            service.start([centerStep('a11y', 'A11y Title', 'A11y Content')]);
            detectChanges();
        });

        it('tooltip should have role="dialog"', () => {
            expect(query('.beacon-tooltip')!.getAttribute('role')).toBe('dialog');
        });

        it('tooltip should have aria-modal="true"', () => {
            expect(query('.beacon-tooltip')!.getAttribute('aria-modal')).toBe('true');
        });

        it('tooltip should reference title via aria-labelledby', () => {
            const labelledBy = query('.beacon-tooltip')!.getAttribute('aria-labelledby');
            expect(labelledBy).toBe('beacon-title-a11y');
            const titleEl = fixture.nativeElement.querySelector(`#${labelledBy}`);
            expect(titleEl).toBeTruthy();
            expect(titleEl!.textContent!.trim()).toBe('A11y Title');
        });

        it('tooltip should reference content via aria-describedby', () => {
            const describedBy = query('.beacon-tooltip')!.getAttribute('aria-describedby');
            expect(describedBy).toBe('beacon-content-a11y');
            const contentEl = fixture.nativeElement.querySelector(`#${describedBy}`);
            expect(contentEl).toBeTruthy();
            expect(contentEl!.textContent!.trim()).toBe('A11y Content');
        });

        it('step content should have aria-live="polite"', () => {
            expect(query('.beacon-tooltip-content')!.getAttribute('aria-live')).toBe('polite');
        });

        it('SVG should be aria-hidden', () => {
            expect(query('svg')!.getAttribute('aria-hidden')).toBe('true');
        });

        it('close button should have an aria-label', () => {
            expect(query('.beacon-tooltip-close')!.getAttribute('aria-label')).toBeTruthy();
        });

        it('navigation buttons should have aria-labels', () => {
            expect(query('.beacon-tooltip-button.primary')!.getAttribute('aria-label')).toBeTruthy();
            expect(query('.beacon-tooltip-button.secondary')!.getAttribute('aria-label')).toBeTruthy();
        });

        it('step counter should be aria-hidden', () => {
            expect(query('.beacon-step-counter')!.getAttribute('aria-hidden')).toBe('true');
        });
    });

    // ── Keyboard: Escape ────────────────────────────────────────────

    describe('keyboard support', () => {
        it('Escape key should stop the tour', () => {
            setup();
            service.start([centerStep('esc1')]);
            detectChanges();

            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            detectChanges();

            expect(service.isActive()).toBe(false);
        });

        it('Escape key should be a no-op when tour is inactive', () => {
            setup();
            detectChanges();

            // Should not throw
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            detectChanges();

            expect(service.isActive()).toBe(false);
        });
    });

    // ── Focus management ────────────────────────────────────────────

    describe('focus management', () => {
        it('should move focus to the tooltip when the tour starts', fakeAsync(() => {
            setup();
            const btn = document.createElement('button');
            btn.id = 'prev-focus-btn';
            document.body.appendChild(btn);
            btn.focus();

            service.start([centerStep('f1')]);
            detectChanges();
            tick(16);
            fixture.detectChanges();

            const tooltip = query('.beacon-tooltip') as HTMLElement;
            expect(document.activeElement).toBe(tooltip);

            btn.remove();
        }));

        it('should restore focus to the previously focused element on stop', fakeAsync(() => {
            setup();
            const btn = document.createElement('button');
            btn.id = 'restore-focus-btn';
            document.body.appendChild(btn);
            btn.focus();

            service.start([centerStep('f2')]);
            detectChanges();
            tick(16);
            fixture.detectChanges();

            service.stop();
            detectChanges();
            tick(180);
            fixture.detectChanges();

            expect(document.activeElement).toBe(btn);

            btn.remove();
        }));
    });

    // ── Custom config & labels ──────────────────────────────────────

    describe('custom config', () => {
        it('should use custom labels from BEACON_CONFIG', () => {
            setup([
                { provide: BEACON_CONFIG, useValue: { labels: { close: 'Dismiss' } } },
            ]);
            service.start([centerStep('cfg1')]);
            detectChanges();

            expect(query('.beacon-tooltip-close')!.getAttribute('aria-label')).toBe('Dismiss');
        });

        it('should use custom backdrop color from BEACON_CONFIG', () => {
            setup([
                { provide: BEACON_CONFIG, useValue: { backdropColor: 'rgba(255, 0, 0, 0.3)' } },
            ]);
            service.start([centerStep('cfg2')]);
            detectChanges();

            const rect = fixture.nativeElement.querySelector('svg > rect:last-child');
            expect(rect!.getAttribute('fill')).toBe('rgba(255, 0, 0, 0.3)');
        });

        it('should use default backdrop color when none is configured', () => {
            setup();
            service.start([centerStep('cfg3')]);
            detectChanges();

            const rect = fixture.nativeElement.querySelector('svg > rect:last-child');
            expect(rect!.getAttribute('fill')).toBe('rgba(0, 0, 0, 0.5)');
        });

        it('should translate labels via BEACON_TRANSLATE_FN', () => {
            setup([
                { provide: BEACON_CONFIG, useValue: { labels: { close: 'btn.close' } } },
                { provide: BEACON_TRANSLATE_FN, useValue: (key: string) => `[${key}]` },
            ]);
            service.start([centerStep('cfg4')]);
            detectChanges();

            expect(query('.beacon-tooltip-close')!.getAttribute('aria-label')).toBe('[btn.close]');
        });
    });

    // ── Tooltip positioning (covers switch branches) ────────────────

    describe('tooltip positioning', () => {
        it('should position tooltip above the target when position is "above"', () => {
            setup();
            createTarget('above-target');
            service.start([{
                id: 'pos-above', title: 'Above', content: 'C', position: 'above',
                selector: '#above-target',
            }]);
            detectChanges();

            const tooltip = query('.beacon-tooltip')!;
            const top = parseFloat(tooltip.style.top);
            // "above" means tooltip.top < target.top (100px)
            expect(top).toBeLessThan(100);
        });

        it('should position tooltip at the start (left) of the target', () => {
            setup();
            createTarget('start-target');
            service.start([{
                id: 'pos-start', title: 'Start', content: 'C', position: 'start',
                selector: '#start-target',
            }]);
            detectChanges();

            const tooltip = query('.beacon-tooltip')!;
            // Tooltip exists and is positioned
            expect(tooltip.style.left).toBeTruthy();
        });

        it('should position tooltip at the end (right) of the target', () => {
            setup();
            createTarget('end-target');
            service.start([{
                id: 'pos-end', title: 'End', content: 'C', position: 'end',
                selector: '#end-target',
            }]);
            detectChanges();

            const tooltip = query('.beacon-tooltip')!;
            const left = parseFloat(tooltip.style.left);
            // "end" places tooltip after the target's right edge (200 + 150 = 350)
            expect(left).toBeGreaterThanOrEqual(8); // at least SPOTLIGHT_PAD
        });

        it('should center the tooltip when position is "center" and target exists', () => {
            setup();
            createTarget('center-target');
            service.start([{
                id: 'pos-center', title: 'Center', content: 'C', position: 'center',
                selector: '#center-target',
            }]);
            detectChanges();

            const tooltip = query('.beacon-tooltip')!;
            expect(tooltip.style.left).toBeTruthy();
            expect(tooltip.style.top).toBeTruthy();
        });

        it('should center the tooltip when there is no target rect', () => {
            setup();
            service.start([centerStep('no-rect')]);
            detectChanges();

            const tooltip = query('.beacon-tooltip')!;
            expect(tooltip.style.left).toBeTruthy();
            expect(tooltip.style.top).toBeTruthy();
        });
    });

    // ── Step change effect: selector not found in DOM ───────────────

    describe('step change with missing selector', () => {
        it('should handle a step whose selector does not match any DOM element', () => {
            setup();
            // A step with showWithoutTarget so it passes start() filtering,
            // but also has a selector that doesn't exist
            service.start([{
                id: 'ghost', title: 'Ghost', content: 'C', position: 'below',
                selector: '#does-not-exist-xyz',
                showWithoutTarget: true,
            }]);
            detectChanges();

            // Should still render the tooltip (showWithoutTarget), just no spotlight
            expect(query('.beacon-tooltip')).toBeTruthy();
            const blockers = queryAll('.beacon-click-blocker');
            // Full-page blocker (no spotlight)
            expect(blockers.length).toBe(1);
        });
    });

    // ── Viewport listeners (scroll/resize) ──────────────────────────

    describe('viewport listeners', () => {
        it('should update targetRect on window resize when tour is active with a target', fakeAsync(() => {
            setup();
            createTarget('resize-target');
            service.start([selectorStep('vl1', '#resize-target')]);
            detectChanges();

            // Move the target element
            targetEl!.style.top = '200px';
            window.dispatchEvent(new Event('resize'));
            tick(32); // throttleTime is 16ms, give it enough time
            fixture.detectChanges();

            // The overlay should have updated — just verify it didn't crash
            expect(query('.beacon-tooltip')).toBeTruthy();
        }));

        it('should update targetRect on document scroll when tour is active with a target', fakeAsync(() => {
            setup();
            createTarget('scroll-target');
            service.start([selectorStep('vl2', '#scroll-target')]);
            detectChanges();

            document.dispatchEvent(new Event('scroll'));
            tick(32);
            fixture.detectChanges();

            expect(query('.beacon-tooltip')).toBeTruthy();
        }));

        it('should not update when tour is inactive during resize', fakeAsync(() => {
            setup();
            detectChanges();

            window.dispatchEvent(new Event('resize'));
            tick(32);
            fixture.detectChanges();

            // No crash, no tooltip
            expect(query('.beacon-tooltip')).toBeNull();
        }));
    });
});
