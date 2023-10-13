import React from "react";

import { ModuleContext } from "./ModuleContext";
import { StatusMessageType, StatusSource } from "./ModuleInstanceStatusController";
import { ModuleInstanceStatusControllerInternal } from "./internal/ModuleInstanceStatusControllerInternal";

export class ViewStatusWriter {
    private _statusController: ModuleInstanceStatusControllerInternal;

    constructor(statusController: ModuleInstanceStatusControllerInternal) {
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
    private _statusController: ModuleInstanceStatusControllerInternal;

    constructor(statusController: ModuleInstanceStatusControllerInternal) {
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

export function useViewStatusWriter(moduleContext: ModuleContext<any>): ViewStatusWriter {
    const statusController = moduleContext.getStatusController();

    const statusWriter = React.useRef<ViewStatusWriter>(new ViewStatusWriter(statusController));

    statusController.clearMessages(StatusSource.View);
    statusController.incrementReportedComponentRenderCount(StatusSource.View);

    React.useEffect(function handleRender() {
        statusController.reviseAndPublishState();
    });

    return statusWriter.current;
}

export function useSettingsStatusWriter(moduleContext: ModuleContext<any>): ViewStatusWriter {
    const statusController = moduleContext.getStatusController();

    const statusWriter = React.useRef<ViewStatusWriter>(new ViewStatusWriter(statusController));

    statusController.clearMessages(StatusSource.Settings);
    statusController.incrementReportedComponentRenderCount(StatusSource.Settings);

    React.useEffect(function handleRender() {
        statusController.reviseAndPublishState();
    });

    return statusWriter.current;
}
