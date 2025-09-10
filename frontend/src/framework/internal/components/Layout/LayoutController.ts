import type { CSSProperties } from "react";

import type { LayoutElement } from "@framework/internal/WorkbenchSession/Dashboard";
import { MANHATTAN_LENGTH, type Size2D } from "@lib/utils/geometry";
import { point2Distance, type Vec2 } from "@lib/utils/vec2";
import { globalLog } from "@src/Log";
import { isEqual } from "lodash";

import { LayoutNode, LayoutAxis, type LayoutNodeEdge, makeLayoutNodes } from "./LayoutNode";

export type LayoutControllerBindings = {
    // State getters
    getViewportSize: () => Size2D;

    // React-side effects
    setRootNode: (rootNode: LayoutNode) => void;
    setTempLayout: (tempLayout: LayoutElement[] | null) => void;
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

enum Phase {
    IDLE = "idle", // No interaction
    HOVER = "hover", // Showing where the user is going to add the module
    PREVIEW = "preview", // Showing a preview of the new layout
}

export type ResizeSource = {
    axis: LayoutAxis;
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

    private _activeRootNode: LayoutNode | null = null;
    private _previewRootNode: LayoutNode | null = null;
    private _isPreviewing: boolean = false;

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

    setCommittedLayout(elements: LayoutElement[]) {
        this._activeRootNode = makeLayoutNodes(elements);
        if (!this._isPreviewing) {
            this._bindings.setRootNode(this._activeRootNode);
            this._bindings.setTempLayout(null);
        }
    }

    private currentRootNode(): LayoutNode | null {
        return this._previewRootNode ?? this._activeRootNode;
    }

    private pushPreviewRootNode(): void {
        if (!this._previewRootNode) return;
        this._bindings.setRootNode(this._previewRootNode.clone());
        this._bindings.setTempLayout(this._previewRootNode.toLayout());
    }

    /** Ensure we have a frozen preview root. Push an initial snapshot to the view. */
    private ensurePreviewRootNode(): LayoutNode | null {
        if (!this._previewRootNode) {
            this._previewRootNode = this._activeRootNode ? this._activeRootNode.clone() : null;
            if (this._previewRootNode) {
                // Push first preview snapshot
                this._bindings.setRootNode(this._previewRootNode);
                this._bindings.setTempLayout(this._previewRootNode.toLayout());
            }
        }
        this.setIsPreviewing(true);
        return this._previewRootNode;
    }

    startDrag(dragSource: DragSource) {
        this.clearHoverTimer();
        this.clearCancelTimer();
        this._hoverTarget = null;
        this._hoverLocalPos = null;
        this._lastLocalPos = null;
        this.setPhase(Phase.IDLE);

        logger.console?.log("Starting drag", dragSource);

        // Ensure we have a preview root node
        this.ensurePreviewRootNode();

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

    private setIsPreviewing(isPreviewing: boolean) {
        if (this._isPreviewing === isPreviewing) return;
        this._isPreviewing = isPreviewing;
        logger.console?.log("Setting isPreviewing to", isPreviewing);
    }

    startResize(src: ResizeSource) {
        logger.console?.log("Starting resize", src);
        this._mode = {
            kind: ModeKind.RESIZE,
            src,
            lastClientPos: src.pointerDownClientPos,
        };

        // lock the appropriate resize cursor for the duration of the resize
        this._bindings.setCursor(src.axis === LayoutAxis.VERTICAL ? "ew-resize" : "ns-resize");

        this.ensurePreviewRootNode();

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
        this._hoverTarget = null;
        this._hoverLocalPos = null;
        this._bindings.setTempLayout(null);
        this._bindings.setDragAndClientPosition(null, null);
        this._bindings.setDraggingModuleId(null);
        this._bindings.setTempPlaceholderId(null);
        this._bindings.setCursor("default");
        this.setIsPreviewing(false);
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
            this.setIsPreviewing(true);
            return;
        }

        if (this._mode.kind === ModeKind.DRAG) {
            if (this.isOutOfViewport(local)) {
                logger.console?.log("Pointer moved out of viewport, cancelling interaction");

                this._bindings.setTempLayout(null);
                this._bindings.setDragAndClientPosition(null, null);
                this._hoverTarget = null;
                this._hoverLocalPos = null;
                this.clearHoverTimer();
                this.clearCancelTimer();
                this._previewRootNode = null;

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
        const layoutElements = this._previewRootNode?.toLayout();
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

        const root = this.currentRootNode();
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
        if (this._mode.kind === ModeKind.IDLE) return;

        // 1) Unlock cursor immediately (visual feedback)
        this._bindings.setCursor("default");

        if (this._mode.kind === ModeKind.DRAG) {
            const source = this._mode.source;

            // --- Decide what to commit BEFORE clearing hover/temp state ---
            let toCommit: LayoutElement[] | null = this._previewRootNode?.toLayout() ?? null;

            // If no preview yet (never promoted) but we're in HOVER,
            // synthesize a one-off preview at the last hover position.
            if (!toCommit && this._phase === Phase.HOVER) {
                toCommit = this.synthesizeHoverPreviewLayout();
            }

            /*

            // NEW module empty-dashboard fallback (unchanged)
            if (isDragSourceKindNew(source) && (!toCommit || toCommit.length === 0) && this._hoverTarget) {
                const empty = !this._activeRootNode || this._activeRootNode.getChildren().length === 0;
                if (empty) {
                    toCommit = [
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
                */

            // --- Now clear UI state ---
            this.clearHoverTimer();
            this.clearCancelTimer();
            // (DON'T null _hoverLocalPos before synthesize; we did synthesis above)
            this._hoverTarget = null;
            this._hoverLocalPos = null;

            this._bindings.setDragAndClientPosition(null, null);
            this._bindings.setDraggingModuleId(null);
            this._bindings.setTempPlaceholderId(null);

            // --- Commit ---
            if (isDragSourceKindNew(source)) {
                if (toCommit && toCommit.length) {
                    this._bindings.createModuleAndCommit(source.moduleName, toCommit, source.id);
                } else {
                    this._bindings.setTempLayout(null); // cancel add
                }
            } else {
                if (toCommit && toCommit.length) {
                    this._bindings.commitLayout(toCommit);
                }
                this._bindings.setTempLayout(null);
            }
        }

        if (this._mode.kind === ModeKind.RESIZE) {
            // Commit resized layout from the preview root; cancel if none
            const previewElements = this._previewRootNode?.toLayout() ?? null;
            if (previewElements && previewElements.length) {
                this._bindings.commitLayout(previewElements);
            }
            this._bindings.setTempLayout(null);
        }

        // 5) Exit preview mode (single place)
        this._previewRootNode = null;
        this.setIsPreviewing(false);

        // 6) Controller housekeeping
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

        const root = this.currentRootNode();
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
                this._previewRootNode = pre;
                this.pushPreviewRootNode();
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

        const root = this._previewRootNode;
        if (!root) return;

        const local = this._lastLocalPos ?? this._bindings.toLocalPx(this._mode.lastClientPos);
        const viewport = this._bindings.getViewportSize();

        const clone = root.clone();

        const container = LayoutNode.findByPath(clone, this._mode.src.containerPath);
        if (!container) {
            this._bindings.setTempLayout(null);
            return;
        }

        const abs = container.getAbsoluteRect(); // in 0..1 relative to root

        // map local px to container-relative [0..1] along the axis
        const pos01 =
            this._mode.src.axis === LayoutAxis.VERTICAL
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

        this._previewRootNode = clone;
        this.pushPreviewRootNode();
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

        const root = this.currentRootNode();
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

        this._previewRootNode = pre;
        this.updateDragPosition();
        this.pushPreviewRootNode();
    }

    private cancelPreviewForHoverExit() {
        this._hoverTarget = null;
        this._hoverLocalPos = null;
        this.clearHoverTimer();
        this._bindings.setTempLayout(null);
        this.setPhase(Phase.HOVER);
    }

    private isOverPreviewPlaceholder(local: Vec2): boolean {
        if (this._mode.kind !== ModeKind.DRAG || !this._previewRootNode) {
            return false;
        }

        const layout: LayoutElement[] | null = this._previewRootNode.toLayout();

        if (!layout) return false;

        const draggedId = this._mode.source.id;
        const element = layout.find((le) => le.moduleInstanceId === draggedId);
        if (!element) return false;

        const viewportSize = this._bindings.getViewportSize();
        const x = element.relX * viewportSize.width;
        const y = element.relY * viewportSize.height;
        const width = element.relWidth * viewportSize.width;
        const height = element.relHeight * viewportSize.height;

        const pad = PREVIEW_STICKY_PAD_PX; // padding around the placeholder
        return local.x >= x - pad && local.x <= x + width + pad && local.y >= y - pad && local.y <= y + height + pad;
    }
}
