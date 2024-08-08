import React from "react";

import { SettingsContext, ViewContext } from "./ModuleContext";
import {
    ModuleInstanceStatusController,
    Origin,
    StatusMessage,
    StatusMessageType,
    StatusSource,
} from "./ModuleInstanceStatusController";

export class ViewStatusWriter {
    private _statusController: ModuleInstanceStatusController;

    constructor(statusController: ModuleInstanceStatusController) {
        this._statusController = statusController;
    }

    setLoading(isLoading: boolean): void {
        this._statusController.setLoading(isLoading);
    }

    addError(error: StatusMessage | string): void {
        if (typeof error === "string") {
            error = { message: error, origin: Origin.MODULE };
        }
        this._statusController.addMessage(StatusSource.View, { type: StatusMessageType.Error, ...error });
    }

    addWarning(warning: StatusMessage | string): void {
        if (typeof warning === "string") {
            warning = { message: warning, origin: Origin.MODULE };
        }
        this._statusController.addMessage(StatusSource.View, { type: StatusMessageType.Warning, ...warning });
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

    addError(error: StatusMessage | string): void {
        if (typeof error === "string") {
            error = { message: error, origin: Origin.MODULE };
        }
        this._statusController.addMessage(StatusSource.Settings, { type: StatusMessageType.Error, ...error });
    }

    addWarning(warning: StatusMessage | string): void {
        if (typeof warning === "string") {
            warning = { message: warning, origin: Origin.MODULE };
        }
        this._statusController.addMessage(StatusSource.Settings, { type: StatusMessageType.Warning, ...warning });
    }

    setDebugMessage(message: string): void {
        this._statusController.setDebugMessage(StatusSource.Settings, message);
    }
}

export function useViewStatusWriter(viewContext: ViewContext<any>): ViewStatusWriter {
    const statusController = viewContext.getStatusController();

    const statusWriter = React.useRef<ViewStatusWriter>(new ViewStatusWriter(statusController));

    statusController.clearHotMessageCache(StatusSource.View);
    statusController.incrementReportedComponentRenderCount(StatusSource.View);

    React.useEffect(function handleRender() {
        statusController.reviseAndPublishState();
    });

    return statusWriter.current;
}

export function useSettingsStatusWriter(settingsContext: SettingsContext<any>): SettingsStatusWriter {
    const statusController = settingsContext.getStatusController();

    const statusWriter = React.useRef<SettingsStatusWriter>(new SettingsStatusWriter(statusController));

    statusController.clearHotMessageCache(StatusSource.Settings);
    statusController.incrementReportedComponentRenderCount(StatusSource.Settings);

    React.useEffect(function handleRender() {
        statusController.reviseAndPublishState();
    });

    return statusWriter.current;
}
