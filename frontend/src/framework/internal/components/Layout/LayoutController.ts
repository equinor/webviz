import type { CSSProperties } from "react";

import { isEqual } from "lodash";

import type { LayoutElement } from "@framework/internal/WorkbenchSession/Dashboard";
import { MANHATTAN_LENGTH, type Size2D } from "@lib/utils/geometry";
import { point2Distance, type Vec2 } from "@lib/utils/vec2";
import { globalLog } from "@src/Log";

import { LayoutNode, type LayoutNodeEdge } from "./LayoutNode";

export type LayoutControllerBindings = {
    // State getters
    getRootNode: () => LayoutNode | null;
    getViewportSize: () => Size2D;
    getCurrentTempLayout: () => LayoutElement[] | null;

    // React-side effects
    setTempLayout: (next: LayoutElement[] | null) => void;
    setDragAndClientPosition: (dragPosition: Vec2 | null, clientPos: Vec2 | null) => void;
    setDraggingModuleId: (id: string | null) => void;
    setTempPlaceholderId: (id: string | null) => void;
    setCursor: (cursor: CSSProperties["cursor"]) => void;

    // Dashboard ops
    commitLayout: (next: LayoutElement[]) => void;
    createModuleAndCommit: (moduleName: string, next: LayoutElement[], tempId: string) => void;

    // Utilities
    toLocalPx: (clientPos: Vec2) => Vec2;
    scheduleFrame: (callback: FrameRequestCallback) => number;
    cancelFrame: (id: number) => void;
};

export enum DragSourceKind {
    EXISTING = "EXISTING",
    NEW = "NEW",
}

enum ModeKind {
    IDLE = "idle",
    DRAG_POINTER_DOWN = "drag-pointer-down",
    DRAG = "drag",
    RESIZE = "resize",
}

export type DragSource = {
    id: string;
    elementPos: Vec2;
    elementSize: Size2D;
    pointerDownClientPos: Vec2;
} & ({ kind: DragSourceKind.EXISTING } | { kind: DragSourceKind.NEW; moduleName: string });

function isDragSourceKindNew(src: DragSource): src is DragSource & { kind: DragSourceKind.NEW; moduleName: string } {
    return src.kind === DragSourceKind.NEW;
}

export enum ResizeAxis {
    HORIZONTAL = "horizontal",
    VERTICAL = "vertical",
}

enum Phase {
    IDLE = "idle", // No interaction
    HOVER = "hover", // Showing where the user is going to add the module
    PREVIEW = "preview", // Showing a preview of the new layout
}

export type ResizeSource = {
    axis: ResizeAxis;
    containerPath: number[];
    index: number;
    pointerDownClientPos: Vec2;
};

type Mode =
    | { kind: ModeKind.IDLE }
    | {
          kind: ModeKind.DRAG_POINTER_DOWN;
          source: DragSource;
          pointerOffset: { x: number; y: number };
          lastClientPos: Vec2;
      }
    | {
          kind: ModeKind.DRAG;
          source: DragSource;
          lastClientPos: Vec2;
          pointerOffset: { x: number; y: number };
      }
    | { kind: ModeKind.RESIZE; src: ResizeSource; lastClientPos: Vec2 };

type HoverTarget = {
    containerPath: number[];
    edge: LayoutNodeEdge;
};

const HOVER_DWELL_MS = 500; // wait this long on same edge before previewing
const EXIT_DWELL_MS = 500; // wait this long after leaving edge before clearing preview
const PREVIEW_STICKY_PAD_PX = 10; // px padding around the preview to keep it visible when moving away from the edge
const RESIZE_SNAP_STEP = 0.01; // 1% steps (tune to taste)
const RESIZE_MIN_TILE_SIZE: Size2D = { width: 200, height: 200 }; // minimum tile size in px

const logger = globalLog.registerLogger("LayoutController");

export class LayoutController {
    // Bindings to the React side
    private _bindings: LayoutControllerBindings;

    // The current interaction mode, either idle, dragging, or resizing
    private _mode: Mode = { kind: ModeKind.IDLE };

    // the current requestAnimationFrame ID, or null if not scheduled
    private _rafId: number | null = null;

    // Last local position of the pointer in px, used for scheduling updates
    private _lastLocalPos: Vec2 | null = null;

    // The current hover target, if any
    // This is the edge and container path where the pointer is hovering
    // Used to determine when to show the hover arrows and when to promote to preview
    // null if not hovering over any edge
    private _hoverTarget: HoverTarget | null = null;

    // The last preview layout, used to avoid flickering
    // This is the layout that was last previewed, or null if no preview is active
    private _lastPreviewLayout: LayoutElement[] | null = null;

    private _hoverLocalPos: Vec2 | null = null;
    private _hoverTimerId: ReturnType<typeof setTimeout> | null = null;
    private _cancelTimerId: ReturnType<typeof setTimeout> | null = null;
    private _phase: Phase = Phase.IDLE;

    // Bound handler refs (single stable references for add/remove)
    private _boundOnPointerMove: (e: PointerEvent) => void;
    private _boundOnPointerUp: (e: PointerEvent) => void;
    private _boundOnPointerCancel: (e: PointerEvent) => void;
    private _boundOnKeyDown: (e: KeyboardEvent) => void;

    constructor(bindings: LayoutControllerBindings) {
        this._bindings = bindings;

        this._boundOnPointerMove = this.onPointerMove.bind(this);
        this._boundOnPointerUp = this.onPointerUp.bind(this);
        this._boundOnPointerCancel = this.onPointerCancel.bind(this);
        this._boundOnKeyDown = this.onKeyDown.bind(this);

        logger.console?.log("Initialized");
    }

    attach() {
        logger.console?.log("Attaching event listeners");
        document.addEventListener("pointermove", this._boundOnPointerMove, { passive: false });
        document.addEventListener("pointerup", this._boundOnPointerUp, { passive: false });
        document.addEventListener("pointercancel", this._boundOnPointerCancel, { passive: false });
        document.addEventListener("keydown", this._boundOnKeyDown);
    }

    detach() {
        logger.console?.log("Detaching event listeners");
        document.removeEventListener("pointermove", this._boundOnPointerMove);
        document.removeEventListener("pointerup", this._boundOnPointerUp);
        document.removeEventListener("pointercancel", this._boundOnPointerCancel);
        document.removeEventListener("keydown", this._boundOnKeyDown);

        this.cancelInteraction();
    }

    startDrag(dragSource: DragSource) {
        this.clearHoverTimer();
        this.clearCancelTimer();
        this._hoverTarget = null;
        this._hoverLocalPos = null;
        this._lastPreviewLayout = null; // optional but safest
        this._lastLocalPos = null;
        this.setPhase(Phase.IDLE);

        logger.console?.log("Starting drag", dragSource);

        // Compute offset so the card doesn't jump
        const localPointerDown = this._bindings.toLocalPx(dragSource.pointerDownClientPos);
        const localElementTopLeft = this._bindings.toLocalPx(dragSource.elementPos);
        const pointerOffset = {
            x: localPointerDown.x - localElementTopLeft.x,
            y: localPointerDown.y - localElementTopLeft.y,
        };

        this._mode = {
            kind: ModeKind.DRAG_POINTER_DOWN,
            source: dragSource,
            pointerOffset,
            lastClientPos: dragSource.pointerDownClientPos,
        };
    }

    startResize(src: ResizeSource) {
        logger.console?.log("Starting resize", src);
        this._mode = {
            kind: ModeKind.RESIZE,
            src,
            lastClientPos: src.pointerDownClientPos,
        };

        // lock the appropriate resize cursor for the duration of the resize
        this._bindings.setCursor(src.axis === ResizeAxis.VERTICAL ? "ew-resize" : "ns-resize");

        // first preview immediately
        const local = this._bindings.toLocalPx(src.pointerDownClientPos);
        this.queueResizePreview(local);
    }

    updateBindings(next: LayoutControllerBindings) {
        logger.console?.log("Updating bindings");
        this._bindings = next;
    }

    cancelInteraction() {
        logger.console?.log("Cancelling interaction");

        this.cancelAnyScheduledFrame();
        this.clearHoverTimer();
        this.clearCancelTimer();
        this.setPhase(Phase.IDLE);
        this._mode = { kind: ModeKind.IDLE };
        this._lastPreviewLayout = null;
        this._hoverTarget = null;
        this._hoverLocalPos = null;
        this._bindings.setTempLayout(null);
        this._bindings.setDragAndClientPosition(null, null);
        this._bindings.setDraggingModuleId(null);
        this._bindings.setTempPlaceholderId(null);
        this._bindings.setCursor("default");
    }

    private setPhase(phase: Phase) {
        logger.console?.log("Setting phase", phase);
        if (this._phase === phase) {
            return; // no change
        }
        this._phase = phase;
    }

    private isOutOfViewport(local: Vec2): boolean {
        const vp = this._bindings.getViewportSize();
        const M = 25; // px margin
        return local.x < -M || local.y < -M || local.x > vp.width + M || local.y > vp.height + M;
    }

    private onPointerMove(e: PointerEvent) {
        if (this._mode.kind === ModeKind.IDLE) return;

        // suppress scroll/selection during interactions
        e.preventDefault();
        e.stopPropagation();

        this._mode.lastClientPos = { x: e.clientX, y: e.clientY };
        const local = this._bindings.toLocalPx(this._mode.lastClientPos);

        if (this._mode.kind === ModeKind.DRAG_POINTER_DOWN) {
            const distance = point2Distance(this._mode.source.pointerDownClientPos, this._mode.lastClientPos);

            if (distance < MANHATTAN_LENGTH) {
                return; // not far enough to start dragging
            }

            logger.console?.log("Transitioning to drag mode");

            // Transition to drag mode
            this._mode = {
                kind: ModeKind.DRAG,
                source: this._mode.source,
                lastClientPos: this._mode.lastClientPos,
                pointerOffset: this._mode.pointerOffset,
            };
            this._bindings.setDraggingModuleId(this._mode.source.id);
            if (isDragSourceKindNew(this._mode.source)) {
                this._bindings.setTempPlaceholderId(this._mode.source.id);
            }
            this._bindings.setCursor("grabbing");
            const dragPos = {
                x: local.x - this._mode.pointerOffset.x,
                y: local.y - this._mode.pointerOffset.y,
            };
            this._bindings.setDragAndClientPosition(dragPos, local);
            this.queueDragPreview(local);
            this.setPhase(Phase.HOVER);
            return;
        }

        if (this._mode.kind === ModeKind.DRAG) {
            if (this.isOutOfViewport(local)) {
                logger.console?.log("Pointer moved out of viewport, cancelling interaction");

                this._lastPreviewLayout = null;
                this._bindings.setTempLayout(null);
                this._bindings.setDragAndClientPosition(null, null);
                this._hoverTarget = null;
                this._hoverLocalPos = null;
                this.clearHoverTimer();
                this.clearCancelTimer();
                return;
            }

            this.updateDragPosition();
            this.queueDragPreview(local);
        } else if (this._mode.kind === ModeKind.RESIZE) {
            this.queueResizePreview(local);
        }
    }

    private updateDragPosition(): void {
        if (this._mode.kind !== ModeKind.DRAG) return;

        const localClientPos = this._bindings.toLocalPx(this._mode.lastClientPos);

        const draggedId = this._mode.source.id;
        const draggedSize = this.calcModuleInstanceSize(draggedId);
        if (!draggedSize) {
            return;
        }

        const relativePointerOffset: Vec2 = {
            x: this._mode.pointerOffset.x / this._mode.source.elementSize.width,
            y: this._mode.pointerOffset.y / this._mode.source.elementSize.height,
        };

        const newAbsolutePointerOffset: Vec2 = {
            x: localClientPos.x - relativePointerOffset.x * draggedSize.width,
            y: localClientPos.y - this._mode.pointerOffset.y,
        };

        this._bindings.setDragAndClientPosition(newAbsolutePointerOffset, localClientPos);
    }

    private calcModuleInstanceSize(moduleInstanceId: string): Size2D | null {
        if (this._mode.kind !== ModeKind.DRAG) {
            return null; // not in drag mode
        }
        const layoutElements = this._lastPreviewLayout;
        if (!layoutElements) {
            return this._mode.source.elementSize; // if no temp layout, use the original size
        }

        const element = layoutElements.find((el) => el.moduleInstanceId === moduleInstanceId);
        if (!element) return null;

        const viewportSize = this._bindings.getViewportSize();
        return {
            width: element.relWidth * viewportSize.width,
            height: element.relHeight * viewportSize.height,
        };
    }

    private synthesizeHoverPreviewLayout(): LayoutElement[] | null {
        logger.console?.log("Synthesizing hover preview layout");
        if (this._mode.kind !== ModeKind.DRAG || !this._hoverTarget || !this._hoverLocalPos) {
            logger.console?.log("No hover target or local position, returning null");
            return null;
        }

        const root = this._bindings.getRootNode();
        if (!root) {
            logger.console?.log("No root node, returning null");
            return null;
        }

        const isNew = this._mode.source.kind === DragSourceKind.NEW;
        const pre = root.previewLayout(
            this._hoverLocalPos,
            this._bindings.getViewportSize(),
            this._mode.source.id,
            isNew,
        );

        return pre ? pre.toLayout() : null;
    }

    private onPointerUp() {
        if (this._mode.kind === ModeKind.IDLE) {
            return;
        }

        this._bindings.setCursor("default");

        if (this._mode.kind === ModeKind.DRAG) {
            let candidate = this._bindings.getCurrentTempLayout() ?? this._lastPreviewLayout;

            if (this._phase === Phase.HOVER) {
                candidate = this.synthesizeHoverPreviewLayout();
            }

            this.clearHoverTimer();
            this.clearCancelTimer();

            this._hoverTarget = null;
            this._hoverLocalPos = null;

            // clear UI state first
            this._bindings.setDragAndClientPosition(null, null);
            this._bindings.setDraggingModuleId(null);
            this._bindings.setTempPlaceholderId(null);

            const source = this._mode.source;

            if (isDragSourceKindNew(source)) {
                // If literally nothing (no preview and no hover), allow empty-dashboard fallback; otherwise cancel.
                if (!candidate || candidate.length === 0) {
                    const root = this._bindings.getRootNode();
                    const empty = root && root.getChildren().length === 0;
                    if (empty) {
                        candidate = [
                            {
                                relX: 0,
                                relY: 0,
                                relWidth: 1,
                                relHeight: 1,
                                moduleInstanceId: source.id,
                                moduleName: source.moduleName,
                            },
                        ];
                    }
                }

                if (candidate && candidate.length) {
                    // keep temp visible (loading tile) until creation finishes
                    this._bindings.createModuleAndCommit(source.moduleName, candidate, source.id);
                    this._bindings.setTempLayout(null);
                } else {
                    // No valid placement → cancel add
                    this._bindings.setTempLayout(null);
                }
            } else {
                // EXISTING module move
                if (candidate && candidate.length) {
                    this._bindings.commitLayout(candidate);
                }
                this._bindings.setTempLayout(null);
            }
        }

        if (this._mode.kind === ModeKind.RESIZE) {
            const temp = this._bindings.getCurrentTempLayout();
            if (temp && temp.length) this._bindings.commitLayout(temp);
            this._bindings.setTempLayout(null);
        }

        this.cancelAnyScheduledFrame();
        this._mode = { kind: ModeKind.IDLE };
        this.setPhase(Phase.IDLE);
    }

    private onPointerCancel() {
        logger.console?.log("Pointer interaction cancelled");
        this.cancelInteraction();
    }

    private onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            this.cancelInteraction();
        }
    }

    private scheduleFrame(fn: () => void) {
        if (this._rafId != null) {
            this.cancelAnyScheduledFrame();
        }
        logger.console?.log("Scheduling frame for drag/resize update");
        this._rafId = this._bindings.scheduleFrame(() => {
            this._rafId = null;
            fn();
        });
    }

    private cancelAnyScheduledFrame() {
        if (this._rafId != null) {
            logger.console?.log("Cancelling scheduled frame");
            this._bindings.cancelFrame(this._rafId);
            this._rafId = null;
        }
    }

    private queueDragPreview(localPos: Vec2) {
        this._lastLocalPos = localPos;
        this.scheduleFrame(() => this.updateDragPreview());
    }

    private queueResizePreview(localPos: Vec2) {
        this._lastLocalPos = localPos;
        this.scheduleFrame(() => this.updateResizePreview());
    }

    private updateDragPreview() {
        if (this._mode.kind !== ModeKind.DRAG) {
            logger.console?.log("Not in drag mode, skipping drag preview update");
            return;
        }

        const root = this._bindings.getRootNode();
        if (!root) {
            logger.console?.log("No root node, skipping drag preview update");
            return;
        }

        const local = this._lastLocalPos ?? this._bindings.toLocalPx(this._mode.lastClientPos);
        const viewportSize = this._bindings.getViewportSize();

        // empty layout: promote immediately
        if (this._mode.source.kind === DragSourceKind.NEW && root.getChildren().length === 0) {
            logger.console?.log("Empty layout, promoting to preview immediately");
            const pre = root.previewLayout(local, viewportSize, this._mode.source.id, true);
            if (pre) {
                this.applyPreview(pre.toLayout());
            }
            return;
        }

        // edge hover detection (arrows phase)
        const container = root.findBoxContainingPoint(local, viewportSize);
        if (!container) {
            logger.console?.log("Pointer not over any container, clearing hover and cancel timers");
            this._hoverTarget = null;
            this._hoverLocalPos = null;
            this.clearHoverTimer();
            if (this._phase === Phase.PREVIEW) {
                if (this.isOverPreviewPlaceholder(local)) {
                    this.clearCancelTimer();
                } else {
                    this.armCancelTimer();
                }
            }
            return;
        }

        const edge = container.findEdgeContainingPoint(local, viewportSize, this._mode.source.id);
        if (!edge) {
            logger.console?.log("Pointer not over any edge, clearing hover and cancel timers");
            this._hoverTarget = null;
            this._hoverLocalPos = null;
            this.clearHoverTimer();
            if (this._phase === Phase.PREVIEW) {
                if (this.isOverPreviewPlaceholder(local)) {
                    logger.console?.log("Pointer over preview placeholder, clearing cancel timer");
                    this.clearCancelTimer();
                } else {
                    logger.console?.log("Pointer over preview placeholder, arming cancel timer");
                    this.armCancelTimer();
                }
            }
            return;
        }

        logger.console?.log("Pointer over edge", edge, "in container", container.pathFromRoot());

        // Over a valid edge
        // this.clearHoverTimer();
        // this.clearCancelTimer();

        const key = { containerPath: container.pathFromRoot(), edge: edge };
        const same =
            this._hoverTarget &&
            isEqual(key.edge, this._hoverTarget.edge) &&
            key.containerPath.length === this._hoverTarget.containerPath.length &&
            key.containerPath.every((v, i) => v === this._hoverTarget!.containerPath[i]);

        if (!same) {
            logger.console?.log("Pointer moved to a new edge, updating hover target");
            this.clearCancelTimer();
            // new edge under pointer -> start dwell timer
            this._hoverTarget = key;
            this._hoverLocalPos = local;
            this.armHoverTimer();
            return; // show arrows only until timer fires
        }
    }

    private updateResizePreview() {
        if (this._mode.kind !== ModeKind.RESIZE) return;
        const root = this._bindings.getRootNode();
        if (!root) return;

        const local = this._lastLocalPos ?? this._bindings.toLocalPx(this._mode.lastClientPos);
        const clone = root.clone();

        const container = LayoutNode.findByPath(clone, this._mode.src.containerPath);
        if (!container) {
            this._bindings.setTempLayout(null);
            return;
        }

        const viewport = this._bindings.getViewportSize();
        const abs = container.getAbsoluteRect(); // in 0..1 relative to root

        // map local px to container-relative [0..1] along the axis
        const pos01 =
            this._mode.src.axis === ResizeAxis.VERTICAL
                ? (local.x / viewport.width - abs.x) / abs.width
                : (local.y / viewport.height - abs.y) / abs.height;

        // clamp and snap
        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
        const snap = (v: number, step: number) => Math.round(v / step) * step;

        const resizeMinTileFractions: Size2D = {
            width: RESIZE_MIN_TILE_SIZE.width / viewport.width,
            height: RESIZE_MIN_TILE_SIZE.height / viewport.height,
        };

        container.resizeAtDivider(
            this._mode.src.index,
            this._mode.src.axis,
            snap(clamp01(pos01), RESIZE_SNAP_STEP),
            resizeMinTileFractions,
        );

        this._bindings.setTempLayout(clone.toLayout());
    }

    private clearHoverTimer() {
        if (this._hoverTimerId) {
            clearTimeout(this._hoverTimerId);
            this._hoverTimerId = null;
        }
    }

    private clearCancelTimer() {
        if (this._cancelTimerId) {
            clearTimeout(this._cancelTimerId);
            this._cancelTimerId = null;
        }
    }

    private armCancelTimer() {
        this.clearCancelTimer();
        this._cancelTimerId = setTimeout(() => {
            this.cancelPreviewForHoverExit();
        }, EXIT_DWELL_MS);
    }

    private armHoverTimer() {
        this.clearHoverTimer();
        this._hoverTimerId = setTimeout(() => {
            this.promoteHoverToPreview();
        }, HOVER_DWELL_MS);
    }

    private promoteHoverToPreview() {
        this.clearCancelTimer();
        if (this._mode.kind !== ModeKind.DRAG || !this._hoverTarget || !this._hoverLocalPos) {
            logger.console?.log("Not in drag mode or no hover target, skipping preview promotion");
            return;
        }

        const root = this._bindings.getRootNode();
        if (!root) {
            logger.console?.log("No root node, cannot promote hover to preview");
            return;
        }

        const isNew = this._mode.source.kind === DragSourceKind.NEW;
        const pre = root.previewLayout(
            this._hoverLocalPos,
            this._bindings.getViewportSize(),
            this._mode.source.id,
            isNew,
        );
        if (!pre) {
            logger.console?.log("No preview layout created");
            return;
        }

        this.applyPreview(pre.toLayout());
    }

    private applyPreview(next: LayoutElement[]) {
        // Avoid re-setting the same preview to prevent flicker
        const same =
            this._lastPreviewLayout &&
            this._lastPreviewLayout.length === next.length &&
            this._lastPreviewLayout.every((a, i) => {
                const b = next[i];
                return (
                    a.moduleInstanceId === b.moduleInstanceId &&
                    a.relX === b.relX &&
                    a.relY === b.relY &&
                    a.relWidth === b.relWidth &&
                    a.relHeight === b.relHeight
                );
            });

        if (!same) {
            logger.console?.log("Applying new preview layout", next);
            this._lastPreviewLayout = next;
            this._bindings.setTempLayout(next);
        } else {
            logger.console?.log("Preview layout unchanged, skipping update");
        }
        this.updateDragPosition();
        this.setPhase(Phase.PREVIEW);
    }

    private cancelPreviewForHoverExit() {
        this._lastPreviewLayout = null;
        this._hoverTarget = null;
        this._hoverLocalPos = null;
        this.clearHoverTimer();
        this._bindings.setTempLayout(null);
        this.setPhase(Phase.HOVER);
    }

    private isOverPreviewPlaceholder(local: Vec2): boolean {
        if (this._mode.kind !== ModeKind.DRAG || !this._lastPreviewLayout) {
            return false;
        }

        const draggedId = this._mode.source.id;
        const element = this._lastPreviewLayout.find((el) => el.moduleInstanceId === draggedId);
        if (!element) {
            return false; // not over a placeholder
        }

        const viewportSize = this._bindings.getViewportSize();
        const x = element.relX * viewportSize.width;
        const y = element.relY * viewportSize.height;
        const width = element.relWidth * viewportSize.width;
        const height = element.relHeight * viewportSize.height;

        const pad = PREVIEW_STICKY_PAD_PX; // padding around the placeholder
        return local.x >= x - pad && local.x <= x + width + pad && local.y >= y - pad && local.y <= y + height + pad;
    }
}
