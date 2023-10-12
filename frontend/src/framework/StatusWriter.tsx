import React from "react";

import { ModuleContext } from "./ModuleContext";
import { ModuleInstanceStatusController, StatusMessageType, StatusSource } from "./ModuleInstanceStatusController";

export class ViewStatusWriter {
    private _statusController: ModuleInstanceStatusController;

    constructor(moduleContext: ModuleContext<any>) {
        this._statusController = moduleContext.getModuleInstanceStatusController();
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

    constructor(moduleContext: ModuleContext<any>) {
        this._statusController = moduleContext.getModuleInstanceStatusController();
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

function useStatusWriter<
    T extends StatusSource,
    TStatusWriter = T extends StatusSource.View ? ViewStatusWriter : SettingsStatusWriter
>(moduleContext: ModuleContext<any>, statusSource: T): TStatusWriter {
    const statusWriter = React.useRef<TStatusWriter>(
        (statusSource === StatusSource.View
            ? new ViewStatusWriter(moduleContext)
            : new SettingsStatusWriter(moduleContext)) as TStatusWriter
    );

    const statusController = moduleContext.getModuleInstanceStatusController();
    statusController.clearMessages(statusSource);
    statusController.incrementReportedComponentRenderCount(statusSource);

    React.useEffect(function handleRender() {
        statusController.reviseState();
    });

    return statusWriter.current;
}

export function useViewStatusWriter(moduleContext: ModuleContext<any>): ViewStatusWriter {
    return useStatusWriter(moduleContext, StatusSource.View);
}

export function useSettingsStatusWriter(moduleContext: ModuleContext<any>): SettingsStatusWriter {
    return useStatusWriter(moduleContext, StatusSource.Settings);
}
