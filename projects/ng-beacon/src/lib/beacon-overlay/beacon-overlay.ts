import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { asyncScheduler, fromEvent, merge, throttleTime } from 'rxjs';
import { BEACON_CONFIG, BEACON_TRANSLATE_FN, BeaconStep, DEFAULT_BEACON_LABELS } from '../beacon.model';
import { BeaconService } from '../beacon.service';

@Component({
    selector: 'beacon-overlay',
    imports: [],
    templateUrl: './beacon-overlay.html',
    styleUrl: './beacon-overlay.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(document:keydown.escape)': 'onEscape()',
        '(document:keydown.arrowright)': 'beaconService.next()',
        '(document:keydown.arrowleft)': 'beaconService.prev()',
    },
})
export class BeaconOverlay {
    private readonly SPOTLIGHT_PAD = 8;
    private readonly OVERLAY_TRANSITION_MS = 180;
    private readonly document = inject(DOCUMENT);
    private readonly destroyRef = inject(DestroyRef);
    private readonly targetRect = signal<DOMRect | null>(null);
    private readonly tooltipSize = signal({ width: 320, height: 200 });
    private readonly viewportSize = signal({ width: window.innerWidth, height: window.innerHeight });
    private readonly config = inject(BEACON_CONFIG);
    private readonly translateFn = inject(BEACON_TRANSLATE_FN);
    private previouslyFocusedElement: Element | null = null;
    private currentTargetEl: Element | null = null;
    private hideTimeoutId: number | null = null;
    protected readonly tooltipEl = viewChild<ElementRef<HTMLDivElement>>('tooltipEl');
    protected readonly beaconService = inject(BeaconService);
    protected readonly renderedStep = signal<BeaconStep | null>(null);
    protected readonly overlayVisible = signal(false);

    protected readonly labels = computed(() => {
        const merged = { ...DEFAULT_BEACON_LABELS, ...this.config.labels };

        return {
            close: this.translateFn(merged.close),
            nextStep: this.translateFn(merged.nextStep),
            prevStep: this.translateFn(merged.prevStep),
        };
    });

    protected readonly spotlightRect = computed(() => {
        const rect = this.targetRect();

        if (!rect) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        const pad = this.SPOTLIGHT_PAD;

        return {
            x: Math.max(0, rect.left - pad),
            y: Math.max(0, rect.top - pad),
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
        };
    });

    protected readonly backdropColor = computed(() =>
        this.config.backdropColor ?? 'rgba(0, 0, 0, 0.5)'
    );

    protected readonly tooltipPosition = computed(() => {
        const step = this.renderedStep();
        const { width: vw, height: vh } = this.viewportSize();
        const { width: tooltipWidth, height: tooltipHeight } = this.tooltipSize();

        const windowCenter = {
            x: Math.round(vw / 2 - tooltipWidth / 2),
            y: Math.round(vh / 2 - tooltipHeight / 2),
        };

        if (!step) {
            return windowCenter;
        }

        const targetRect = this.targetRect();

        if (!targetRect) {
            return windowCenter;
        }

        const rectXCenter = Math.round(targetRect.left + targetRect.width / 2 - tooltipWidth / 2);
        const rectYCenter = Math.round(targetRect.top + targetRect.height / 2 - tooltipHeight / 2);
        let x: number;
        let y: number;

        switch (step.position) {
            case 'above':
                x = rectXCenter;
                y = Math.round(targetRect.top - tooltipHeight - this.SPOTLIGHT_PAD * 1.5);
                break;
            case 'below':
                x = rectXCenter;
                y = Math.round(targetRect.bottom + this.SPOTLIGHT_PAD * 1.5);
                break;
            case 'start':
                x = Math.round(targetRect.left - tooltipWidth);
                y = rectYCenter;
                break;
            case 'end':
                x = Math.round(targetRect.right);
                y = rectYCenter;
                break;
            case 'center':
                x = windowCenter.x;
                y = windowCenter.y;
                break;
        }

        // Clamp to viewport
        x = Math.max(this.SPOTLIGHT_PAD, Math.min(x, vw - tooltipWidth - this.SPOTLIGHT_PAD * 1.5));
        y = Math.max(this.SPOTLIGHT_PAD, Math.min(y, vh - tooltipHeight - this.SPOTLIGHT_PAD * 1.5));

        return { x, y };
    });

    constructor() {
        this.initViewportListeners();

        effect((onCleanup) => {
            const isActive = this.beaconService.isActive();

            if (isActive) {
                if (this.hideTimeoutId !== null) {
                    window.clearTimeout(this.hideTimeoutId);
                    this.hideTimeoutId = null;
                }

                if (!this.overlayVisible()) {
                    if (this.previouslyFocusedElement === null) {
                        this.previouslyFocusedElement = this.document.activeElement;
                    }

                    requestAnimationFrame(() => {
                        if (!this.beaconService.isActive()) {
                            return;
                        }

                        this.overlayVisible.set(true);
                        this.focusTooltip();
                    });
                }
            } else {
                this.currentTargetEl = null;

                if (!this.renderedStep()) {
                    return;
                }

                this.overlayVisible.set(false);

                const hideTimeoutId = window.setTimeout(() => {
                    this.renderedStep.set(null);
                    this.targetRect.set(null);
                    this.restoreFocus();
                    this.hideTimeoutId = null;
                }, this.OVERLAY_TRANSITION_MS);

                this.hideTimeoutId = hideTimeoutId;
                onCleanup(() => window.clearTimeout(hideTimeoutId));
            }
        });

        effect(() => {
            const step = this.beaconService.currentStep();

            if (!step) {
                return;
            }

            this.renderedStep.set(step);

            if (step.selector === undefined) {
                this.currentTargetEl = null;
                this.targetRect.set(null);

                return;
            }

            const targetEl = this.document.querySelector(step.selector);

            if (!targetEl) {
                this.currentTargetEl = null;
                this.targetRect.set(null);

                return;
            }

            this.currentTargetEl = targetEl;
            targetEl.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'nearest' });
            this.targetRect.set(targetEl.getBoundingClientRect());
        });

        effect((onCleanup) => {
            const tooltipEl = this.tooltipEl();

            if (!tooltipEl) {
                return;
            }

            const observer = new ResizeObserver(() => {
                const { offsetWidth, offsetHeight } = tooltipEl.nativeElement;

                if (offsetWidth > 0 && offsetHeight > 0) {
                    this.tooltipSize.set({ width: offsetWidth, height: offsetHeight });
                }
            });

            observer.observe(tooltipEl.nativeElement);

            onCleanup(() => observer.disconnect());
        });
    }

    protected onEscape(): void {
        if (this.beaconService.isActive()) {
            this.beaconService.stop();
        }
    }

    private initViewportListeners(): void {
        const scroll$ = fromEvent(this.document, 'scroll', { capture: true, passive: true });
        const resize$ = fromEvent(this.document.defaultView!, 'resize');

        merge(scroll$, resize$).pipe(
            throttleTime(16, asyncScheduler, { trailing: true }),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe(() => {
            this.viewportSize.set({ width: window.innerWidth, height: window.innerHeight });

            if (!this.beaconService.isActive() || !this.currentTargetEl) {
                return;
            }

            this.targetRect.set(this.currentTargetEl.getBoundingClientRect());
        });
    }

    private focusTooltip(): void {
        this.tooltipEl()?.nativeElement.focus();
    }

    private restoreFocus(): void {
        if (this.previouslyFocusedElement) {
            (this.previouslyFocusedElement as HTMLElement).focus?.();
            this.previouslyFocusedElement = null;
        }
    }
}
