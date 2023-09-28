// Events and states that are shared between different parts of the GUI
// Events are non-persistent, states are persistent
// States can be stored in the browser's local storage

export enum DrawerContent {
    ModuleSettings = "ModuleSettings",
    ModulesList = "ModulesList",
    TemplatesList = "TemplatesList",
    SyncSettings = "SyncSettings",
    ColorPaletteSettings = "ColorPaletteSettings",
}

export enum GuiMessageBrokerStates {
    DrawerContent = "drawerContent",
    SettingsPanelWidthInPercent = "settingsPanelWidthInPercent",
    LoadingEnsembleSet = "loadingEnsembleSet",
}

export enum GuiMessageBrokerEvents {
    ModuleHeaderPointerDown = "moduleHeaderClick",
}

type EventTypes = {
    [GuiMessageBrokerEvents.ModuleHeaderPointerDown]: {
        details: {
            moduleInstanceId: string;
        };
    };
};

type MessageTypes = {
    [GuiMessageBrokerStates.DrawerContent]: {
        state: DrawerContent;
        persistent: true;
    };
    [GuiMessageBrokerStates.SettingsPanelWidthInPercent]: {
        state: number;
        persistent: true;
    };
    [GuiMessageBrokerStates.LoadingEnsembleSet]: {
        state: boolean;
        persistent: false;
    };
};

export type GuiEvent = {
    details: EventTypes[GuiMessageBrokerEvents];
};

export type GuiState = {
    state: MessageTypes[GuiMessageBrokerStates];
};

export class GuiMessageBroker {
    private _eventListeners: Map<GuiMessageBrokerEvents, ((message: GuiEvent) => void)[]>;
    private _stateListeners: Map<GuiMessageBrokerStates, ((message: GuiState) => void)[]>;
    private _storedValues: Map<GuiMessageBrokerStates, GuiState>;

    constructor() {
        this._eventListeners = new Map();
        this._stateListeners = new Map();
        this._storedValues = new Map();
    }
}
