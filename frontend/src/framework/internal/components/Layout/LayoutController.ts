import type { LayoutElement } from "@framework/internal/WorkbenchSession/Dashboard";
import type { Size2D } from "@lib/utils/geometry";
import type { Vec2 } from "@lib/utils/vec2";

import { LayoutNode } from "./LayoutNode";

export type LayoutControllerBindings = {
    // State getters
    getRootNode: () => LayoutNode | null;
    getViewportSize: () => Size2D;
    getCurrentTempLayout: () => LayoutElement[] | null;

    // React-side effects
    setTempLayout: (next: LayoutElement[] | null) => void;
    setDraggingOverlay: (dragPosition: Vec2 | null, clientPos: Vec2 | null) => void;
    setDraggingModuleId: (id: string | null) => void;
    setTempPlaceholderId: (id: string | null) => void;

    // Dashboard ops
    commitLayout: (next: LayoutElement[]) => void;
    createModuleAndCommit: (moduleName: string, next: LayoutElement[], tempId: string) => Promise<void>;

    // Utilities
    toLocalPx: (clientPos: Vec2) => Vec2;
    scheduleFrame: (callback: FrameRequestCallback) => number;
    cancelFrame: (id: number) => void;
};

export enum DragSourceKind {
    EXISTING = "EXISTING",
    NEW = "NEW",
}

export type DragSource = {
    id: string;
    elementPos: Vec2;
    elementSize: Size2D;
    pointerDownClientPos: Vec2;
} & ({ kind: DragSourceKind.EXISTING } | { kind: DragSourceKind.NEW; moduleName: string });

export enum ResizeAxis {
    HORIZONTAL = "horizontal",
    VERTICAL = "vertical",
}

export type ResizeSource = {
    axis: ResizeAxis;
    containerPath: number[];
    index: number;
    pointerDownClientPos: Vec2;
};

type Mode =
    | { kind: "idle" }
    | {
          kind: "drag";
          src: DragSource;
          lastClientPos: Vec2;
          rafId?: number | null;
          pointerOffset: { x: number; y: number };
      }
    | { kind: "resize"; src: ResizeSource; lastClientPos: Vec2; rafId?: number | null };

const HOVER_DWELL_MS = 500; // wait this long on same edge before previewing
const EXIT_DWELL_MS = 200; // wait this long after leaving edge before clearing preview

export class LayoutController {
    private _bindings: LayoutControllerBindings;
    private _mode: Mode = { kind: "idle" };
    private _rafId: number | null = null;
    private _lastLocalPos: Vec2 | null = null;
    private _hoverTarget: {
        containerPath: number[];
        edge: "left" | "right" | "top" | "bottom" | "vertical" | "horizontal";
    } | null = null;
    private _lastPreviewLayout: LayoutElement[] | null = null;
    private _lastMoveT = 0;
    private _lastMoveLocal: Vec2 | null = null;
    private _hoverLocalPos: Vec2 | null = null;
    private _hoverTimerId: ReturnType<typeof setTimeout> | null = null;
    private _cancelTimerId: ReturnType<typeof setTimeout> | null = null;

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
    }

    attach() {
        document.addEventListener("pointermove", this._boundOnPointerMove, { passive: false });
        document.addEventListener("pointerup", this._boundOnPointerUp, { passive: false });
        document.addEventListener("pointercancel", this._boundOnPointerCancel, { passive: false });
        document.addEventListener("keydown", this._boundOnKeyDown);
    }

    detach() {
        document.removeEventListener("pointermove", this._boundOnPointerMove);
        document.removeEventListener("pointerup", this._boundOnPointerUp);
        document.removeEventListener("pointercancel", this._boundOnPointerCancel);
        document.removeEventListener("keydown", this._boundOnKeyDown);
        this.cancelAnyScheduledFrame();
    }

    startDrag(dragSource: DragSource) {
        // Compute offset in LOCAL px so the card doesn't jump
        const localPointerDown = this._bindings.toLocalPx(dragSource.pointerDownClientPos);
        const localElementTopLeft = this._bindings.toLocalPx(dragSource.elementPos);
        const pointerOffset = {
            x: localPointerDown.x - localElementTopLeft.x,
            y: localPointerDown.y - localElementTopLeft.y,
        };

        this._mode = {
            kind: "drag",
            src: dragSource,
            lastClientPos: dragSource.pointerDownClientPos,
            pointerOffset,
            rafId: null,
        };

        this._bindings.setDraggingModuleId(dragSource.id);
        if (dragSource.kind === DragSourceKind.NEW) this._bindings.setTempPlaceholderId(dragSource.id);

        // initial overlay position
        const dragPos = {
            x: localPointerDown.x - pointerOffset.x,
            y: localPointerDown.y - pointerOffset.y,
        };
        this._bindings.setDraggingOverlay(dragPos, localPointerDown);

        const root = this._bindings.getRootNode();
        if (root) {
            const pre = root.previewLayout(
                localPointerDown,
                this._bindings.getViewportSize(),
                dragSource.id,
                dragSource.kind === DragSourceKind.NEW,
            );
            if (pre) {
                const layout = pre.toLayout();
                this._lastPreviewLayout = layout;
                this._bindings.setTempLayout(pre.toLayout());
            }
        }

        // first preview
        this.queueDragPreview(localPointerDown);
    }

    startResize(src: ResizeSource) {
        this._mode = {
            kind: "resize",
            src,
            lastClientPos: src.pointerDownClientPos,
            rafId: null,
        };
        // first preview immediately
        const local = this._bindings.toLocalPx(src.pointerDownClientPos);
        this.queueResizePreview(local);
    }

    updateBindings(next: LayoutControllerBindings) {
        this._bindings = next;
    }

    cancelInteraction() {
        this.cancelAnyScheduledFrame();
        this.clearHoverTimer();
        this.clearCancelTimer();
        this._mode = { kind: "idle" };
        this._lastPreviewLayout = null;
        this._hoverTarget = null;
        this._hoverLocalPos = null;
        this._bindings.setTempLayout(null);
        this._bindings.setDraggingOverlay(null, null);
        this._bindings.setDraggingModuleId(null);
        this._bindings.setTempPlaceholderId(null);
    }

    private _isOutOfViewport(local: Vec2): boolean {
        const vp = this._bindings.getViewportSize();
        const M = 25; // px margin
        return local.x < -M || local.y < -M || local.x > vp.width + M || local.y > vp.height + M;
    }

    private onPointerMove(e: PointerEvent) {
        if (this._mode.kind === "idle") return;

        // suppress scroll/selection during interactions
        e.preventDefault();
        e.stopPropagation();

        this._mode.lastClientPos = { x: e.clientX, y: e.clientY };
        const local = this._bindings.toLocalPx(this._mode.lastClientPos);

        if (this._mode.kind === "drag") {
            if (this._isOutOfViewport(local)) {
                this._lastPreviewLayout = null;
                this._bindings.setTempLayout(null);
                this._bindings.setDraggingOverlay(null, null);
                this._hoverTarget = null;
                this._hoverLocalPos = null;
                this.clearHoverTimer();
                this.clearCancelTimer();
                return;
            }
            const dragPos = {
                x: local.x - this._mode.pointerOffset.x,
                y: local.y - this._mode.pointerOffset.y,
            };
            this._bindings.setDraggingOverlay(dragPos, local);
            this.queueDragPreview(local);
        } else if (this._mode.kind === "resize") {
            this.queueResizePreview(local);
        }
    }

    private onPointerUp(_e: PointerEvent) {
        if (this._mode.kind === "idle") return;

        if (this._mode.kind === "drag") {
            const temp = this._bindings.getCurrentTempLayout();

            this.clearHoverTimer();
            this.clearCancelTimer();

            // clear UI state first
            this._bindings.setDraggingOverlay(null, null);
            this._bindings.setDraggingModuleId(null);
            this._bindings.setTempPlaceholderId(null);

            if (temp && temp.length) {
                const src = this._mode.src;
                if (src.kind === DragSourceKind.NEW) {
                    // Atomic create + commit with temp-id swap
                    this._bindings
                        .createModuleAndCommit(src.moduleName, temp, src.id)
                        .finally(() => this._bindings.setTempLayout(null));
                } else {
                    this._bindings.commitLayout(temp);
                    this._bindings.setTempLayout(null);
                }
            } else {
                this._bindings.setTempLayout(null);
            }
        }

        if (this._mode.kind === "resize") {
            const temp = this._bindings.getCurrentTempLayout();
            if (temp && temp.length) this._bindings.commitLayout(temp);
            this._bindings.setTempLayout(null);
        }

        this.cancelAnyScheduledFrame();
        this._mode = { kind: "idle" };
    }

    private onPointerCancel(_e: PointerEvent) {
        this.cancelInteraction();
    }

    private onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") this.cancelInteraction();
    }

    private scheduleFrame(fn: () => void) {
        if (this._rafId != null) this.cancelAnyScheduledFrame();
        this._rafId = this._bindings.scheduleFrame(() => {
            this._rafId = null;
            fn();
        });
    }

    private cancelAnyScheduledFrame() {
        if (this._rafId != null) {
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
        if (this._mode.kind !== "drag") return;

        const root = this._bindings.getRootNode();
        if (!root) return;

        const local = this._lastLocalPos ?? this._bindings.toLocalPx(this._mode.lastClientPos);
        const vp = this._bindings.getViewportSize();

        // empty layout: promote immediately
        if (this._mode.src.kind === DragSourceKind.NEW && root.getChildren().length === 0) {
            const pre = root.previewLayout(local, vp, this._mode.src.id, true);
            if (pre) {
                const lay = pre.toLayout();
                this._lastPreviewLayout = lay;
                this._bindings.setTempLayout(lay);
            }
            return;
        }

        // edge hover detection (arrows phase)
        const container = root.findBoxContainingPoint(local, vp);
        if (!container) {
            this._hoverTarget = null;
            this._hoverLocalPos = null;
            this.clearHoverTimer();
            if (this._lastPreviewLayout) this.armCancelTimer();
            else this.clearCancelTimer();
            return;
        }

        const edge = container.findEdgeContainingPoint(local, vp, this._mode.src.id);
        if (!edge) {
            // keep last preview if any; just stop hover dwell
            this._hoverTarget = null;
            this._hoverLocalPos = null;
            this.clearHoverTimer();
            if (this._lastPreviewLayout) {
                this._bindings.setTempLayout(this._lastPreviewLayout);
                this.armCancelTimer();
            } else {
                this.clearCancelTimer();
            }
            return;
        }

        this.clearCancelTimer();

        // same hover target?
        const key = { containerPath: container.pathFromRoot(), edge: edge.edge };
        const same =
            this._hoverTarget &&
            key.edge === this._hoverTarget.edge &&
            key.containerPath.length === this._hoverTarget.containerPath.length &&
            key.containerPath.every((v, i) => v === this._hoverTarget!.containerPath[i]);

        if (!same) {
            // new edge under pointer → start dwell timer
            this._hoverTarget = key;
            this._hoverLocalPos = local;
            this.armHoverTimer();
            return; // show arrows only until timer fires
        }
    }

    private updateResizePreview() {
        if (this._mode.kind !== "resize") return;
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

        // clamp & snap
        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
        const SNAP_STEP = 0.01; // 1% steps (tune to taste)
        const snap = (v: number, step: number) => Math.round(v / step) * step;
        const MIN_FRACTION = 0.05; // 5% per child minimum size

        container.resizeAtDivider(
            this._mode.src.index,
            this._mode.src.axis,
            snap(clamp01(pos01), SNAP_STEP),
            MIN_FRACTION,
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
            this._bindings.setTempLayout(null);
            this._lastPreviewLayout = null;
            this._cancelTimerId = null;
        }, EXIT_DWELL_MS);
    }

    private armHoverTimer() {
        this.clearHoverTimer();
        this._hoverTimerId = setTimeout(() => {
            this.promoteHoverToPreview();
        }, HOVER_DWELL_MS);
    }

    private promoteHoverToPreview() {
        if (this._mode.kind !== "drag" || !this._hoverTarget || !this._hoverLocalPos) return;

        const root = this._bindings.getRootNode();
        if (!root) return;

        const isNew = this._mode.src.kind === DragSourceKind.NEW;
        const pre = root.previewLayout(this._hoverLocalPos, this._bindings.getViewportSize(), this._mode.src.id, isNew);
        if (!pre) return;

        const layout = pre.toLayout();
        this._lastPreviewLayout = layout;
        this._bindings.setTempLayout(layout);
    }

    private cancelPreviewForHoverExit() {
        // user has left the indicated drop edge for a while → clear preview
        this._lastPreviewLayout = null;
        this._bindings.setTempLayout(null);
        this._hoverTarget = null;
        this._hoverLocalPos = null;
    }
}
