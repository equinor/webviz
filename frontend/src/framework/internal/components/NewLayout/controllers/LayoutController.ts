import { GuiEvent, type GuiEventPayloads, type GuiMessageBroker } from "@framework/GuiMessageBroker";
import { DashboardTopic, type Dashboard, type LayoutElement } from "@framework/internal/Dashboard";
import { MANHATTAN_LENGTH, type Rect2D, type Size2D } from "@lib/utils/geometry";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";
import { point2Distance, type Vec2 } from "@lib/utils/vec2";

import { makeLayoutTreeFromLayout, type LayoutNode } from "./LayoutNode";

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
      }
    | {
          kind: ModeKind.RESIZING;
          source: ResizeSource;
      };

export enum LayoutControllerTopic {
    MODE = "MODE",
    LAYOUT = "LAYOUT",
    CURSOR = "CURSOR",
}

export type LayoutControllerPayloads = {
    [LayoutControllerTopic.MODE]: Mode;
    [LayoutControllerTopic.LAYOUT]: LayoutElement[];
    [LayoutControllerTopic.CURSOR]: string | null;
};

export type LayoutControllerBindings = {
    getViewportRect: () => Rect2D;
};

export class LayoutController implements PublishSubscribe<LayoutControllerPayloads> {
    private _guiMessageBroker: GuiMessageBroker;
    private _dashboard: Dashboard;

    private _publishSubscribeDelegate = new PublishSubscribeDelegate<LayoutControllerPayloads>();
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();

    // Bindings to access GUI states
    private _bindings: LayoutControllerBindings;

    // Current interaction mode
    private _mode: Mode = { kind: ModeKind.IDLE };

    // Layout tree
    private _layoutTree: LayoutNode | null = null;

    // We need stable references for the event listeners to be able to remove them later
    private _boundHandlePointerMove = this.handlePointerMove.bind(this);
    private _boundHandlePointerUp = this.handlePointerUp.bind(this);
    private _boundHandlePointerCancel = this.handlePointerCancel.bind(this);
    private _boundHandleKeyDown = this.handleKeyDown.bind(this);

    constructor(guiMessageBroker: GuiMessageBroker, dashboard: Dashboard, bindings: LayoutControllerBindings) {
        this._guiMessageBroker = guiMessageBroker;
        this._dashboard = dashboard;
        this._bindings = bindings;

        this.subscribeToGuiEvents();
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "dashboard",
            dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.Layout)(() =>
                this.handleDashboardLayoutChange(),
            ),
        );
        this.handleDashboardLayoutChange();
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
                return []; // Placeholder, actual layout should be fetched from the dashboard
            }
            if (topic === LayoutControllerTopic.CURSOR) {
                return null; // Placeholder, actual cursor state should be managed
            }
            throw new Error(`Unknown topic: ${topic}`);
        };
        return snapshotGetter;
    }

    updateBindings(newBindings: LayoutControllerBindings) {
        this._bindings = newBindings;
    }

    private handleDashboardLayoutChange() {
        const newLayout = this._dashboard.getLayout();

        this.populateLayoutTree(newLayout);
    }

    private populateLayoutTree(layout: LayoutElement[]) {
        this._layoutTree = makeLayoutTreeFromLayout(layout);
    }

    private transformClientToLocalCoordinates(clientPos: Vec2): Vec2 {
        const viewportRect = this._bindings.getViewportRect();
        if (!viewportRect) {
            throw new Error("Viewport rect is not set");
        }

        return {
            x: clientPos.x - viewportRect.x,
            y: clientPos.y - viewportRect.y,
        };
    }

    private subscribeToGuiEvents() {
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

        this._boundHandlePointerMove = this.handlePointerMove.bind(this);
        this._boundHandlePointerUp = this.handlePointerUp.bind(this);
        this._boundHandlePointerCancel = this.handlePointerCancel.bind(this);
        this._boundHandleKeyDown = this.handleKeyDown.bind(this);

        document.addEventListener("pointermove", this._boundHandlePointerMove);
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

    private handleNewModulePointerDown(payload: GuiEventPayloads[GuiEvent.NewModulePointerDown]) {}

    private handleRemoveModuleInstanceRequest(payload: GuiEventPayloads[GuiEvent.RemoveModuleInstanceRequest]) {}

    private handlePointerMove(event: PointerEvent) {
        // When idleing, we ignore pointer moves
        if (this._mode.kind === ModeKind.IDLE) {
            return;
        }

        // Prevent scrolling and other default actions
        event.preventDefault();
        event.stopPropagation();

        const localPointerPos = this.transformClientToLocalCoordinates({ x: event.clientX, y: event.clientY });

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
            });
        }
    }

    private handlePointerUp(event: PointerEvent) {
        // On pointer up, we return to IDLE mode
        this.setMode({ kind: ModeKind.IDLE });

        this.removeEventListeners();
    }

    private handlePointerCancel(event: PointerEvent) {}

    private handleKeyDown(event: KeyboardEvent) {}

    beforeDispose() {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
        this.removeEventListeners();
    }
}
