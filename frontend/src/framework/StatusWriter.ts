import React from "react";

import { SettingsContext, ViewContext } from "./ModuleContext";
import { ModuleInstanceStatusController, StatusMessageType, StatusSource } from "./ModuleInstanceStatusController";

export class ViewStatusWriter {
    private _statusController: ModuleInstanceStatusController;

    constructor(statusController: ModuleInstanceStatusController) {
        this._statusController = statusController;
    }

    setLoading(isLoading: boolean): void {
        this._statusController.setLoading(isLoading);
    }

    addError(message: string): void {
        this._statusController.addMessage(StatusSource.View, message, StatusMessageType.Error);
    }

    addWarning(message: string): void {
        this._statusController.addMessage(StatusSource.View, message, StatusMessageType.Warning);
    }

    setDebugMessage(message: string): void {
        this._statusController.setDebugMessage(StatusSource.View, message);
    }
}

export class SettingsStatusWriter {
    private _statusController: ModuleInstanceStatusController;

    constructor(statusController: ModuleInstanceStatusController) {
        this._statusController = statusController;
    }

    addError(message: string): void {
        this._statusController.addMessage(StatusSource.Settings, message, StatusMessageType.Error);
    }

    addWarning(message: string): void {
        this._statusController.addMessage(StatusSource.Settings, message, StatusMessageType.Warning);
    }

    setDebugMessage(message: string): void {
        this._statusController.setDebugMessage(StatusSource.Settings, message);
    }
}

export function useViewStatusWriter(viewContext: ViewContext<any, any, any, any>): ViewStatusWriter {
    const statusController = viewContext.getStatusController();

    const statusWriter = React.useRef<ViewStatusWriter>(new ViewStatusWriter(statusController));

    statusController.clearMessages(StatusSource.View);
    statusController.incrementReportedComponentRenderCount(StatusSource.View);

    React.useEffect(function handleRender() {
        statusController.reviseAndPublishState();
    });

    return statusWriter.current;
}

export function useSettingsStatusWriter(settingsContext: SettingsContext<any, any, any, any>): SettingsStatusWriter {
    const statusController = settingsContext.getStatusController();

    const statusWriter = React.useRef<SettingsStatusWriter>(new SettingsStatusWriter(statusController));

    statusController.clearMessages(StatusSource.Settings);
    statusController.incrementReportedComponentRenderCount(StatusSource.Settings);

    React.useEffect(function handleRender() {
        statusController.reviseAndPublishState();
    });

    return statusWriter.current;
}
