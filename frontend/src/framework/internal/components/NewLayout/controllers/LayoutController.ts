import { GuiEvent, type GuiEventPayloads, type GuiMessageBroker } from "@framework/GuiMessageBroker";
import { DashboardTopic, type Dashboard, type LayoutElement } from "@framework/internal/Dashboard";
import { MANHATTAN_LENGTH, rectContainsPoint, type Rect2D, type Size2D } from "@lib/utils/geometry";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";
import { point2Distance, type Vec2 } from "@lib/utils/vec2";

import { makeLayoutTreeFromLayout, type Edge, type LayoutNode } from "./LayoutNode";

export enum PreviewPhase {
    NONE = "NONE",
    /* The user is hovering a valid drop target but the layout has not been adjusted yet */
    INDICATING = "INDICATING",
    /* The layout has been adjusted to show where the module will be dropped */
    FULL = "FULL",
}

export enum ModeKind {
    IDLE = "IDLE",
    POINTER_DOWN = "POINTER_DOWN",
    DRAGGING = "DRAGGING",
    RESIZING = "RESIZING",
}

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

export type ResizeSource = {};

export type Mode =
    | {
          kind: ModeKind.IDLE;
      }
    | {
          kind: ModeKind.POINTER_DOWN;
          source: DragSource;
          pointerOffset: Vec2;
      }
    | {
          kind: ModeKind.DRAGGING;
          source: DragSource;
          pointerOffset: Vec2;
          dragPosition: Vec2;
          localPointerPos: Vec2;
      }
    | {
          kind: ModeKind.RESIZING;
          source: ResizeSource;
      };

export enum LayoutControllerTopic {
    MODE = "MODE",
    LAYOUT = "LAYOUT",
    LAYOUT_TREE = "LAYOUT_TREE",
    CURSOR = "CURSOR",
    PREVIEW_PHASE = "PREVIEW_PHASE",
    HOVERED_EDGE = "HOVERED_EDGE",
    HOVERED_NODE = "HOVERED_NODE",
}

export type LayoutControllerPayloads = {
    [LayoutControllerTopic.MODE]: Mode;
    [LayoutControllerTopic.LAYOUT]: LayoutElement[];
    [LayoutControllerTopic.LAYOUT_TREE]: LayoutNode | null;
    [LayoutControllerTopic.CURSOR]: string | null;
    [LayoutControllerTopic.PREVIEW_PHASE]: PreviewPhase;
    [LayoutControllerTopic.HOVERED_EDGE]: Edge | null;
    [LayoutControllerTopic.HOVERED_NODE]: LayoutNode | null;
};

export type LayoutControllerBindings = {
    getViewportRect: () => Rect2D;
};

const TEMP_MODULE_INSTANCE_ID = "temp-module-instance-id";

export class LayoutController implements PublishSubscribe<LayoutControllerPayloads> {
    protected _guiMessageBroker: GuiMessageBroker | null = null;
    protected _dashboard: Dashboard | null = null;

    private _publishSubscribeDelegate = new PublishSubscribeDelegate<LayoutControllerPayloads>();
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();

    // Bindings to access GUI states
    protected _bindings: LayoutControllerBindings | null = null;

    protected _isAttached: boolean = false;

    // Current interaction mode
    private _mode: Mode = { kind: ModeKind.IDLE };

    // Layout tree
    private _layoutTree: LayoutNode | null = null;
    private _previewLayoutTreeCandidate: LayoutNode | null = null;
    private _previewLayoutTree: LayoutNode | null = null;

    private _layout: LayoutElement[] = [];

    private _previewPhaseSwitchTimerId: ReturnType<typeof setTimeout> | null = null;
    private _previewPhase: PreviewPhase = PreviewPhase.NONE;
    private _hoveredEdge: Edge | null = null;
    private _hoveredNode: LayoutNode | null = null;

    // We need stable references for the event listeners to be able to remove them later
    private _boundHandlePointerMove: (event: PointerEvent) => void;
    private _boundHandlePointerUp: (event: PointerEvent) => void;
    private _boundHandlePointerCancel: (event: PointerEvent) => void;
    private _boundHandleKeyDown: (event: KeyboardEvent) => void;

    constructor() {
        this._boundHandlePointerMove = this.handlePointerMove.bind(this);
        this._boundHandlePointerUp = this.handlePointerUp.bind(this);
        this._boundHandlePointerCancel = this.handlePointerCancel.bind(this);
        this._boundHandleKeyDown = this.handleKeyDown.bind(this);
    }

    attach(guiMessageBroker: GuiMessageBroker, dashboard: Dashboard, bindings: LayoutControllerBindings) {
        this._guiMessageBroker = guiMessageBroker;
        this._dashboard = dashboard;
        this._bindings = bindings;

        this._isAttached = true;

        this.subscribeToGuiEvents();
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "dashboard",
            dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.Layout)(() =>
                this.handleDashboardLayoutChange(),
            ),
        );
        this.handleDashboardLayoutChange();
    }

    detach() {
        this._isAttached = false;
        this._guiMessageBroker = null;
        this._dashboard = null;
        this._bindings = null;

        this.unsubscribeFromGuiEvents();
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();

        this.setMode({ kind: ModeKind.IDLE });
        this._layoutTree = null;
        this._previewLayoutTree = null;
        this._layout = [];
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<LayoutControllerPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof LayoutControllerPayloads>(topic: T): () => LayoutControllerPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === LayoutControllerTopic.MODE) {
                return this._mode;
            }
            if (topic === LayoutControllerTopic.LAYOUT) {
                return this._layout; // Placeholder, actual layout should be fetched from the dashboard
            }
            if (topic === LayoutControllerTopic.LAYOUT_TREE) {
                if (this._previewLayoutTree) {
                    return this._previewLayoutTree;
                }
                return this._layoutTree;
            }
            if (topic === LayoutControllerTopic.CURSOR) {
                return null; // Placeholder, actual cursor state should be managed
            }
            if (topic === LayoutControllerTopic.PREVIEW_PHASE) {
                return this._previewPhase;
            }
            if (topic === LayoutControllerTopic.HOVERED_EDGE) {
                return this._hoveredEdge;
            }
            if (topic === LayoutControllerTopic.HOVERED_NODE) {
                return this._hoveredNode;
            }
            throw new Error(`Unknown topic: ${topic}`);
        };
        return snapshotGetter;
    }

    private isAttached(): this is this & {
        _guiMessageBroker: GuiMessageBroker;
        _dashboard: Dashboard;
        _bindings: LayoutControllerBindings;
    } {
        return !!(this._isAttached && this._guiMessageBroker && this._dashboard && this._bindings);
    }

    updateBindings(newBindings: LayoutControllerBindings) {
        this._bindings = newBindings;
    }

    private handleDashboardLayoutChange() {
        if (!this.isAttached()) {
            return;
        }
        const newLayout = this._dashboard.getLayout();
        this._layout = newLayout;

        this.populateLayoutTree(newLayout);
    }

    private populateLayoutTree(layout: LayoutElement[]) {
        this._layoutTree = makeLayoutTreeFromLayout(layout);
    }

    private transformClientToLocalCoordinates(clientPos: Vec2): Vec2 {
        if (!this.isAttached()) {
            return clientPos;
        }
        const viewportRect = this._bindings.getViewportRect();

        return {
            x: clientPos.x - viewportRect.x,
            y: clientPos.y - viewportRect.y,
        };
    }

    private subscribeToGuiEvents() {
        if (!this.isAttached()) {
            return;
        }

        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "ModuleInstance",
            this._guiMessageBroker.subscribeToEvent(GuiEvent.ModuleHeaderPointerDown, (payload) =>
                this.handleModuleHeaderPointerDown(payload),
            ),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "ModuleInstance",
            this._guiMessageBroker.subscribeToEvent(GuiEvent.NewModulePointerDown, (payload) =>
                this.handleNewModulePointerDown(payload),
            ),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "ModuleInstance",
            this._guiMessageBroker.subscribeToEvent(GuiEvent.RemoveModuleInstanceRequest, (payload) =>
                this.handleRemoveModuleInstanceRequest(payload),
            ),
        );
    }

    private unsubscribeFromGuiEvents() {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
    }

    private setMode(newMode: Mode) {
        this._mode = newMode;
        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.MODE);
    }

    private handleModuleHeaderPointerDown(payload: GuiEventPayloads[GuiEvent.ModuleHeaderPointerDown]) {
        this.startDragging({
            kind: DragSourceKind.EXISTING,
            id: payload.moduleInstanceId,
            elementPos: payload.elementPosition,
            elementSize: payload.elementSize,
            pointerDownClientPos: payload.pointerPosition,
        });
    }

    private handleNewModulePointerDown(payload: GuiEventPayloads[GuiEvent.NewModulePointerDown]) {
        this.startDragging({
            kind: DragSourceKind.NEW,
            id: TEMP_MODULE_INSTANCE_ID,
            moduleName: payload.moduleName,
            elementPos: payload.elementPosition,
            elementSize: payload.elementSize,
            pointerDownClientPos: payload.pointerPosition,
        });
    }

    private handleRemoveModuleInstanceRequest(payload: GuiEventPayloads[GuiEvent.RemoveModuleInstanceRequest]) {
        if (!this.isAttached()) {
            return;
        }

        // Clone layout tree
        const newLayoutTree = this._layoutTree?.clone();

        if (!newLayoutTree) {
            return;
        }

        // Remove module instance from layout tree
        newLayoutTree.removeModuleInstanceNode(payload.moduleInstanceId);

        // Update layout and layout tree
        const newLayout = newLayoutTree.toLayout();
        this._layout = newLayout;
        this._layoutTree = newLayoutTree;

        // Remove module instance from dashboard
        this._dashboard.removeModuleInstance(payload.moduleInstanceId);
        this._dashboard.setLayout(newLayout);

        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.LAYOUT);
        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.LAYOUT_TREE);
    }

    private startDragging(dragSource: DragSource) {
        const localPointerDown = this.transformClientToLocalCoordinates(dragSource.pointerDownClientPos);
        const localElementPos = this.transformClientToLocalCoordinates(dragSource.elementPos);
        const pointerOffset = {
            x: localPointerDown.x - localElementPos.x,
            y: localPointerDown.y - localElementPos.y,
        };

        this.setMode({
            kind: ModeKind.POINTER_DOWN,
            source: dragSource,
            pointerOffset,
        });

        this.addEventListeners();
    }

    private addEventListeners() {
        this.removeEventListeners();

        document.addEventListener("pointermove", this._boundHandlePointerMove, { passive: false });
        document.addEventListener("pointerup", this._boundHandlePointerUp);
        document.addEventListener("pointercancel", this._boundHandlePointerCancel);
        document.addEventListener("keydown", this._boundHandleKeyDown);
    }

    private removeEventListeners() {
        document.removeEventListener("pointermove", this._boundHandlePointerMove);
        document.removeEventListener("pointerup", this._boundHandlePointerUp);
        document.removeEventListener("pointercancel", this._boundHandlePointerCancel);
        document.removeEventListener("keydown", this._boundHandleKeyDown);
    }

    private handlePointerMove(event: PointerEvent) {
        // When idleing, we ignore pointer moves
        if (this._mode.kind === ModeKind.IDLE) {
            return;
        }

        // Prevent scrolling and other default actions
        event.preventDefault();
        event.stopPropagation();

        const globalPointerPos = { x: event.clientX, y: event.clientY };
        const localPointerPos = this.transformClientToLocalCoordinates(globalPointerPos);

        // If we are in POINTER_DOWN mode, we check if the pointer has moved enough to start dragging
        if (this._mode.kind === ModeKind.POINTER_DOWN) {
            const pointerDownPos = this._mode.source.pointerDownClientPos;
            const pointerCurrentPos = { x: event.clientX, y: event.clientY };
            const moveThreshold = MANHATTAN_LENGTH;

            const distance = point2Distance(pointerDownPos, pointerCurrentPos);
            if (distance < moveThreshold) {
                // Not moved enough yet
                return;
            }

            // Switch to DRAGGING mode
            const dragPosition = {
                x: localPointerPos.x - this._mode.pointerOffset.x,
                y: localPointerPos.y - this._mode.pointerOffset.y,
            };

            this.setMode({
                kind: ModeKind.DRAGGING,
                source: this._mode.source,
                pointerOffset: this._mode.pointerOffset,
                dragPosition,
                localPointerPos,
            });
        }

        if (this._mode.kind === ModeKind.DRAGGING) {
            const dragPosition = {
                x: localPointerPos.x - this._mode.pointerOffset.x,
                y: localPointerPos.y - this._mode.pointerOffset.y,
            };

            this.setMode({
                kind: ModeKind.DRAGGING,
                source: this._mode.source,
                pointerOffset: this._mode.pointerOffset,
                dragPosition,
                localPointerPos,
            });

            if (this.isOutOfViewport(localPointerPos)) {
                this.cancelPreview();
                return;
            }

            this.updateDraggingPreview();
        }
    }

    private isOutOfViewport(localPos: Vec2): boolean {
        if (!this.isAttached()) {
            return false;
        }

        const { width, height } = this._bindings.getViewportRect();
        return !rectContainsPoint({ x: 0, y: 0, width, height }, localPos);
    }

    private cancelPreview() {
        if (!this.isAttached()) {
            return;
        }
        this.clearPreviewPhaseSwitchTimer();
        this._previewLayoutTree = null;
        this._layout = this._dashboard.getLayout();
        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.LAYOUT);
        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.LAYOUT_TREE);
        this.setHoveredEdge(null);
        this.setHoveredNode(null);
        this.setPreviewPhase(PreviewPhase.NONE);
    }

    private updateDraggingPreview() {
        if (!this.isAttached()) {
            return;
        }

        if (!this._layoutTree) {
            return;
        }

        if (this._mode.kind !== ModeKind.DRAGGING) {
            return;
        }

        const viewportRect = this._bindings.getViewportRect();
        if (!viewportRect) {
            return;
        }

        const preview = (this._previewLayoutTree ?? this._layoutTree).makePreviewLayout(
            this._mode.localPointerPos,
            { width: viewportRect.width, height: viewportRect.height },
            this._mode.source.id,
            this._mode.source.kind === DragSourceKind.EXISTING ? false : true,
        );

        if (preview?.hoveredNode.getMetadata()?.moduleInstanceId === this._mode.source.id) {
            return;
        }

        if (!preview) {
            return;
        }

        if (this.maybeResetPreviewPhase(preview.hoveredNode, preview.hoveredEdge)) {
            this.setHoveredEdge(preview.hoveredEdge);
            this.setHoveredNode(preview.hoveredNode);
            this.setPreviewPhase(PreviewPhase.INDICATING);
            this.startPreviewPhaseSwitchTimer(PreviewPhase.NONE, 1000);
            return;
        }

        this.setHoveredEdge(preview.hoveredEdge);
        this.setHoveredNode(preview.hoveredNode);
        this._previewLayoutTreeCandidate = preview.root;

        if (this._previewPhase === PreviewPhase.NONE) {
            this.commitIndicatingPreview();
            return;
        }

        if (this._previewPhase === PreviewPhase.INDICATING) {
            this.startPreviewPhaseSwitchTimer(PreviewPhase.FULL, 1000);
            return;
        }
    }

    private maybeResetPreviewPhase(hoveredNode: LayoutNode | null, hoveredEdge: Edge | null): boolean {
        if (this._previewPhase !== PreviewPhase.FULL) {
            return false;
        }

        if (hoveredNode?.getMetadata()?.moduleInstanceId === TEMP_MODULE_INSTANCE_ID) {
            return false;
        }

        if (
            hoveredNode?.toString() === this._hoveredNode?.toString() &&
            hoveredEdge?.edge === this._hoveredEdge?.edge
        ) {
            return false;
        }

        return true;
    }

    private setHoveredNode(node: LayoutNode | null) {
        if (this._hoveredNode === node) {
            return;
        }

        this._hoveredNode = node;
        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.HOVERED_NODE);
    }

    private setHoveredEdge(edge: Edge | null) {
        if (this._hoveredEdge === edge) {
            return;
        }

        this._hoveredEdge = edge;
        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.HOVERED_EDGE);
    }

    private startPreviewPhaseSwitchTimer(phase: PreviewPhase, delayMs: number = 1000) {
        this.clearPreviewPhaseSwitchTimer();

        let fn = () => {};
        if (phase === PreviewPhase.NONE) {
            fn = () => this.cancelPreview();
        }
        if (phase === PreviewPhase.FULL) {
            fn = () => this.commitFullPreview();
        }

        this._previewPhaseSwitchTimerId = setTimeout(fn, delayMs);
    }

    private clearPreviewPhaseSwitchTimer() {
        if (!this._previewPhaseSwitchTimerId) {
            return;
        }

        clearTimeout(this._previewPhaseSwitchTimerId);
        this._previewPhaseSwitchTimerId = null;
    }

    private setPreviewPhase(newPhase: PreviewPhase) {
        if (this._previewPhase === newPhase) {
            return;
        }

        this._previewPhase = newPhase;
        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.PREVIEW_PHASE);
    }

    private commitIndicatingPreview() {
        if (!this.isAttached()) {
            return;
        }

        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.HOVERED_EDGE);
        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.HOVERED_NODE);
        this.setPreviewPhase(PreviewPhase.INDICATING);

        this.startPreviewPhaseSwitchTimer(PreviewPhase.FULL, 1000);
    }

    private commitFullPreview() {
        this.clearPreviewPhaseSwitchTimer();

        if (!this._previewLayoutTreeCandidate) {
            return;
        }

        this._previewLayoutTree = this._previewLayoutTreeCandidate.clone();
        this._layout = this._previewLayoutTree.toLayout();
        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.LAYOUT);
        this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.LAYOUT_TREE);
        this.setPreviewPhase(PreviewPhase.FULL);
    }

    private handlePointerUp(event: PointerEvent) {
        if (!this.isAttached()) {
            return;
        }

        if (this._mode.kind === ModeKind.DRAGGING && this._previewLayoutTree) {
            // Commit the preview layout to the dashboard
            let newLayout = this._previewLayoutTree.toLayout();
            if (this._mode.source.kind === DragSourceKind.NEW) {
                const instance = this._dashboard.makeAndAddModuleInstance(this._mode.source.moduleName);
                newLayout = newLayout.map((el) => {
                    if (this._mode.kind === ModeKind.DRAGGING && el.moduleInstanceId === this._mode.source.id) {
                        return {
                            ...el,
                            moduleInstanceId: instance.getId(),
                            moduleName: instance.getModule().getName(),
                        };
                    }
                    return el;
                });
            }

            this._dashboard.setLayout(newLayout);
            this._previewLayoutTree = null;
            this._layout = newLayout;
            this._layoutTree = makeLayoutTreeFromLayout(newLayout);
            this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.LAYOUT);
            this._publishSubscribeDelegate.notifySubscribers(LayoutControllerTopic.LAYOUT_TREE);
        }

        // On pointer up, we return to IDLE mode
        this.setMode({ kind: ModeKind.IDLE });
        this.setPreviewPhase(PreviewPhase.NONE);
        this.setHoveredEdge(null);
        this.setHoveredNode(null);

        this.removeEventListeners();
    }

    private handlePointerCancel(event: PointerEvent) {}

    private handleKeyDown(event: KeyboardEvent) {}

    beforeDispose() {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
        this.removeEventListeners();
    }
}
