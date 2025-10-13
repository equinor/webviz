import { GuiEvent, type GuiEventPayloads, type GuiMessageBroker } from "@framework/GuiMessageBroker";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

enum Mode {
    IDLE = "IDLE",
    DRAGGING = "DRAGGING",
    RESIZING = "RESIZING",
}

export class LayoutController {
    private _guiMessageBroker: GuiMessageBroker;
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();

    private _mode: Mode = Mode.IDLE;

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
