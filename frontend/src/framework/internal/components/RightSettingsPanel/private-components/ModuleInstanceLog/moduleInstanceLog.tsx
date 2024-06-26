import React from "react";

import { GuiState, RightDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { StatusMessageType } from "@framework/ModuleInstanceStatusController";
import { Workbench } from "@framework/Workbench";
import {
    LogEntry,
    LogEntryType,
    useStatusControllerStateValue,
} from "@framework/internal/ModuleInstanceStatusControllerInternal";
import { Drawer } from "@framework/internal/components/Drawer";
import { CheckCircle, ClearAll, CloudDone, CloudDownload, Error, History, Warning } from "@mui/icons-material";

export type ModuleInstanceLogProps = {
    workbench: Workbench;
    onClose: () => void;
};

export function ModuleInstanceLog(props: ModuleInstanceLogProps): React.ReactNode {
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);
    const activeModuleInstanceId = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.ActiveModuleInstanceId);

    const moduleInstance = props.workbench.getModuleInstance(activeModuleInstanceId);

    function handleClose() {
        props.onClose();
    }

    function handleClearAll() {
        if (moduleInstance) {
            moduleInstance.getStatusController().clearLog();
        }
    }

    function makeTitle() {
        if (!moduleInstance) {
            return "Module log";
        }

        return `Log for ${moduleInstance.getModule().getName()}`;
    }

    function makeActions() {
        if (!moduleInstance) {
            return null;
        }

        return (
            <div
                className="hover:text-slate-500 cursor-pointer mr-2"
                title="Clear all messages"
                onClick={handleClearAll}
            >
                <ClearAll fontSize="inherit" />
            </div>
        );
    }

    return (
        <Drawer
            title={makeTitle()}
            icon={<History />}
            visible={drawerContent === RightDrawerContent.ModuleInstanceLog}
            onClose={handleClose}
            actions={makeActions()}
        >
            <div className="h-full flex flex-col p-2 gap-1 overflow-y-auto">
                {moduleInstance ? (
                    <LogList moduleInstance={moduleInstance} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        No module selected
                    </div>
                )}
            </div>
        </Drawer>
    );
}

type LogListProps = {
    moduleInstance: ModuleInstance<any, any, any, any>;
};

function LogList(props: LogListProps): React.ReactNode {
    const log = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "log");

    if (log.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">No log entries</div>
        );
    }

    return (
        <>
            {log.map((entry) => (
                <LogEntryComponent key={entry.id} logEntry={entry} />
            ))}
        </>
    );
}

type LogEntryProps = {
    logEntry: LogEntry;
};

function LogEntryComponent(props: LogEntryProps): React.ReactNode {
    let icon = <CloudDownload fontSize="inherit" className="text-gray-600" />;
    let message = "Loading...";
    if (props.logEntry.type === LogEntryType.MESSAGE) {
        if (props.logEntry.message?.type === StatusMessageType.Error) {
            icon = <Error fontSize="inherit" className="text-red-600" />;
        } else if (props.logEntry.message?.type === StatusMessageType.Warning) {
            icon = <Warning fontSize="inherit" className="text-orange-600" />;
        }
        message = props.logEntry.message?.message ?? "";
    } else if (props.logEntry.type === LogEntryType.SUCCESS) {
        icon = <CheckCircle fontSize="inherit" className="text-green-600" />;
        message = "Loading successful";
    } else if (props.logEntry.type === LogEntryType.LOADING_DONE) {
        icon = <CloudDone fontSize="inherit" className="text-blue-600" />;
        message = "Loading done";
    }

    return (
        <div className="py-1 flex gap-3 items-center hover:bg-blue-100 p-2">
            {icon}
            <div className="flex flex-col gap-0.5">
                <span className="text-sm text-gray-500">
                    {convertDatetimeMsToHumanReadableString(props.logEntry.datetimeMs)}
                </span>
                <span title={message}>{message}</span>
            </div>
        </div>
    );
}

function convertDatetimeMsToHumanReadableString(datetimeMs: number): string {
    const date = new Date(datetimeMs);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}
