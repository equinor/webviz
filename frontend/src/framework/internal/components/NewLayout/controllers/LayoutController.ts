import { GuiEvent, type GuiEventPayloads, type GuiMessageBroker } from "@framework/GuiMessageBroker";
import type { Size2D } from "@lib/utils/geometry";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";
import type { Vec2 } from "@lib/utils/vec2";

enum ModeKind {
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

type Mode =
    | {
          kind: ModeKind.IDLE;
      }
    | {
          kind: ModeKind.POINTER_DOWN;
          source: DragSource;
          pointerOffset: Vec2;
          lastClientPos: Vec2;
      }
    | {
          kind: ModeKind.DRAGGING;
          source: DragSource;
          pointerOffset: Vec2;
          lastClientPos: Vec2;
      }
    | {
          kind: ModeKind.RESIZING;
          source: ResizeSource;
          lastClientPos: Vec2;
      };

export class LayoutController {
    private _guiMessageBroker: GuiMessageBroker;
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();

    private _mode: Mode = { kind: ModeKind.IDLE };

    constructor(guiMessageBroker: GuiMessageBroker) {
        this._guiMessageBroker = guiMessageBroker;
        this.subscribeToGuiEvents();
    }

    private subscribeToGuiEvents() {
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "ModuleInstance",
            this._guiMessageBroker.subscribeToEvent(
                GuiEvent.ModuleHeaderPointerDown,
                this.handleModuleHeaderPointerDown.bind(this),
            ),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "ModuleInstance",
            this._guiMessageBroker.subscribeToEvent(
                GuiEvent.NewModulePointerDown,
                this.handleNewModulePointerDown.bind(this),
            ),
        );
        this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
            "ModuleInstance",
            this._guiMessageBroker.subscribeToEvent(
                GuiEvent.RemoveModuleInstanceRequest,
                this.handleRemoveModuleInstanceRequest.bind(this),
            ),
        );
    }

    private handleModuleHeaderPointerDown(payload: GuiEventPayloads[GuiEvent.ModuleHeaderPointerDown]) {}

    private handleNewModulePointerDown(payload: GuiEventPayloads[GuiEvent.NewModulePointerDown]) {}

    private handleRemoveModuleInstanceRequest(payload: GuiEventPayloads[GuiEvent.RemoveModuleInstanceRequest]) {}

    private handlePointerMove(event: PointerEvent) {}

    private handlePointerUp(event: PointerEvent) {}

    private handlePointerCancel(event: PointerEvent) {}

    private handleKeyDown(event: KeyboardEvent) {}

    beforeDispose() {
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
    }
}
