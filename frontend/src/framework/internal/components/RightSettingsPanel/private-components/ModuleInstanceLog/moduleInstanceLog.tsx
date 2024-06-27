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

    let lastDatetimeMs = 0;

    return (
        <>
            {log.map((entry) => {
                let showDatetime = false;
                if (new Date(entry.datetimeMs).getMinutes() !== new Date(lastDatetimeMs).getMinutes()) {
                    showDatetime = true;
                }
                lastDatetimeMs = entry.datetimeMs;
                return (
                    <>
                        {showDatetime && (
                            <div
                                key={entry.datetimeMs}
                                className="text-sm p-2 sticky text-gray-600 text-right border-b border-b-slate-200"
                            >
                                {convertDatetimeMsToHumanReadableString(entry.datetimeMs)}
                            </div>
                        )}
                        <LogEntryComponent key={entry.id} logEntry={entry} />
                    </>
                );
            })}
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
        message = "Data successfully loaded";
    } else if (props.logEntry.type === LogEntryType.LOADING_DONE) {
        icon = <CloudDone fontSize="inherit" className="text-blue-600" />;
        message = "Loading done";
    }

    return (
        <div className="text-transparent py-1 flex gap-3 items-center hover:bg-blue-100 p-2 hover:text-gray-500">
            {icon}
            <span title={message} className="flex-grow text-black">
                {message}
            </span>
            <span className="text-xs">{convertDatetimeMsToHumanReadableString(props.logEntry.datetimeMs, true)}</span>
        </div>
    );
}

function convertDatetimeMsToHumanReadableString(datetimeMs: number, showSeconds?: boolean): string {
    const dateNow = new Date();
    const dateThen = new Date(datetimeMs);

    const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekDay = weekDays[dateThen.getDay()];
    const day = pad(dateThen.getDate(), 2);
    const month = pad(dateThen.getMonth() + 1, 2);
    const year = dateThen.getFullYear();
    const hours = pad(dateThen.getHours(), 2);
    const minutes = pad(dateThen.getMinutes(), 2);
    const seconds = pad(dateThen.getSeconds(), 2);

    if (
        dateNow.getFullYear() === dateThen.getFullYear() &&
        dateNow.getMonth() === dateThen.getMonth() &&
        dateNow.getDate() === dateThen.getDate()
    ) {
        if (!showSeconds) {
            return `${hours}:${minutes}`;
        }

        return `${hours}:${minutes}:${seconds}`;
    }

    if (
        dateNow.getFullYear() === dateThen.getFullYear() &&
        dateNow.getMonth() === dateThen.getMonth() &&
        dateNow.getDate() - dateThen.getDate() === 1
    ) {
        if (!showSeconds) {
            return `Yesterday ${hours}:${minutes}`;
        }

        return `Yesterday ${hours}:${minutes}:${seconds}`;
    }

    if (dateNow.getTime() - dateThen.getTime() < 7 * 24 * 60 * 60 * 1000) {
        if (!showSeconds) {
            return `${weekDay} ${hours}:${minutes}`;
        }

        return `${weekDay} ${hours}:${minutes}:${seconds}`;
    }

    if (!showSeconds) {
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    }

    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

function pad(num: number, size: number): string {
    let s = num + "";
    while (s.length < size) {
        s = "0" + s;
    }
    return s;
}
