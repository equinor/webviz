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
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { CheckCircle, ClearAll, CloudDone, CloudDownload, Error, History, Warning } from "@mui/icons-material";

export type ModuleInstanceLogProps = {
    workbench: Workbench;
    onClose: () => void;
};

export function ModuleInstanceLog(props: ModuleInstanceLogProps): React.ReactNode {
    const [details, setDetails] = React.useState<Record<string, string> | null>(null);
    const [detailsPosY, setDetailsPosY] = React.useState<number>(0);
    const [pointerOverDetails, setPointerOverDetails] = React.useState<boolean>(false);

    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);
    const activeModuleInstanceId = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.ActiveModuleInstanceId);

    const ref = React.useRef<HTMLDivElement>(null);
    const boundingClientRect = useElementBoundingRect(ref);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const moduleInstance = props.workbench.getModuleInstance(activeModuleInstanceId);

    React.useEffect(function handleMount() {
        const currentTimeoutRef = timeoutRef.current;
        return function handleUnmount() {
            if (currentTimeoutRef) {
                clearTimeout(currentTimeoutRef);
            }
        };
    }, []);

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

    const handleShowDetails = React.useCallback(function handleShowDetails(
        details: Record<string, string>,
        posY: number
    ) {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setDetails(details);
        setDetailsPosY(posY);
    },
    []);

    const handleHideDetails = React.useCallback(
        function handleHideDetails() {
            if (pointerOverDetails) {
                return;
            }
            setDetails(null);
        },
        [pointerOverDetails]
    );

    const handleDetailsPointerEnter = React.useCallback(function handleDetailsPointerEnter() {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setPointerOverDetails(true);
    }, []);

    const handleDetailsPointerLeave = React.useCallback(function handleDetailsPointerLeave() {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setPointerOverDetails(false);
            setDetails(null);
        }, 500);
    }, []);

    let right = 0;
    if (boundingClientRect) {
        right = window.innerWidth - boundingClientRect.left + 10;
    }

    return (
        <div ref={ref} className="w-full h-full">
            <Drawer
                title={makeTitle()}
                icon={<History />}
                visible={drawerContent === RightDrawerContent.ModuleInstanceLog}
                onClose={handleClose}
                actions={makeActions()}
            >
                <div className="h-full flex flex-col p-2 gap-1 overflow-y-auto text-sm">
                    {moduleInstance ? (
                        <LogList
                            moduleInstance={moduleInstance}
                            onShowDetails={handleShowDetails}
                            onHideDetails={handleHideDetails}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                            No module selected
                        </div>
                    )}
                </div>
            </Drawer>
            {details &&
                createPortal(
                    <DetailsPopup
                        details={details}
                        right={right}
                        top={detailsPosY}
                        onPointerEnter={handleDetailsPointerEnter}
                        onPointerLeave={handleDetailsPointerLeave}
                    />
                )}
        </div>
    );
}

type LogListProps = {
    onShowDetails: (details: Record<string, string>, yPos: number) => void;
    onHideDetails: () => void;
    moduleInstance: ModuleInstance<any>;
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
                                className="text-xs p-2 sticky text-gray-600 text-right border-b border-b-slate-200"
                            >
                                {convertDatetimeMsToHumanReadableString(entry.datetimeMs)}
                            </div>
                        )}
                        <LogEntryComponent
                            key={entry.id}
                            logEntry={entry}
                            onShowDetails={props.onShowDetails}
                            onHideDetails={props.onHideDetails}
                        />
                    </>
                );
            })}
        </>
    );
}

type LogEntryProps = {
    logEntry: LogEntry;
    onShowDetails: (details: Record<string, string>, yPos: number) => void;
    onHideDetails: () => void;
};

function LogEntryComponent(props: LogEntryProps): React.ReactNode {
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(function handleMount() {
        const currentTimeoutRef = timeoutRef.current;
        return function handleUnmount() {
            if (currentTimeoutRef) {
                clearTimeout(currentTimeoutRef);
            }
        };
    }, []);

    React.useEffect(
        function handleOnHideFunctionChange() {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        },
        [props.onHideDetails]
    );

    function handleShowDetails(e: React.MouseEvent<HTMLDivElement>) {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        const target = e.currentTarget;
        timeoutRef.current = setTimeout(() => {
            if (props.logEntry.type === LogEntryType.MESSAGE) {
                if (props.logEntry.message?.request?.query) {
                    if (!(target instanceof HTMLElement)) {
                        return;
                    }
                    props.onShowDetails(props.logEntry.message.request.query, target.getBoundingClientRect().top);
                }
            }
        }, 500);
    }

    function handleHideDetails() {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            props.onHideDetails();
        }, 500);
    }

    let icon = <CloudDownload fontSize="inherit" className="text-gray-600" />;
    let message = "Loading...";
    let detailsString: React.ReactNode = null;
    let detailsObject: Record<string, string> | null = null;
    if (props.logEntry.type === LogEntryType.MESSAGE) {
        if (props.logEntry.message?.type === StatusMessageType.Error) {
            icon = <Error fontSize="inherit" className="text-red-600" />;
        } else if (props.logEntry.message?.type === StatusMessageType.Warning) {
            icon = <Warning fontSize="inherit" className="text-orange-600" />;
        }
        message = props.logEntry.message?.message ?? "";
        if (props.logEntry.message.request?.query) {
            const text = `${props.logEntry.message.request.method} ${props.logEntry.message.request.url}`;
            detailsString = (
                <div className="overflow-hidden w-full" title={text}>
                    <span className="text-xs text-gray-500 text-ellipsis whitespace-nowrap block max-w-0">{text}</span>
                </div>
            );
            detailsObject = props.logEntry.message.request.query;
        }
    } else if (props.logEntry.type === LogEntryType.SUCCESS) {
        icon = <CheckCircle fontSize="inherit" className="text-green-600" />;
        message = "Data successfully loaded";
    } else if (props.logEntry.type === LogEntryType.LOADING_DONE) {
        icon = <CloudDone fontSize="inherit" className="text-blue-600" />;
        message = "Loading done";
    }

    return (
        <div
            className={resolveClassNames(
                "text-transparent py-1 flex gap-3 items-center p-2 hover:text-gray-400 hover:bg-blue-100",
                {
                    "cursor-help": Boolean(detailsObject),
                }
            )}
            onMouseEnter={handleShowDetails}
            onMouseLeave={handleHideDetails}
        >
            {icon}
            <span title={message} className="flex-grow text-black">
                {message}
                {detailsString}
            </span>
            <span className="text-xs">{convertDatetimeMsToHumanReadableString(props.logEntry.datetimeMs, true)}</span>
        </div>
    );
}

type DetailsPopupProps = {
    details: Record<string, string>;
    right: number;
    top: number;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
};

function DetailsPopup(props: DetailsPopupProps): React.ReactNode {
    const style: React.CSSProperties = { right: props.right };
    if (props.top > window.innerHeight / 2) {
        style.bottom = window.innerHeight - props.top - convertRemToPixels(3);
    } else {
        style.top = props.top;
    }

    return (
        <div
            className="absolute bg-white border border-gray-300 shadow-lg p-1 z-50 w-96 text-sm"
            style={style}
            onPointerEnter={props.onPointerEnter}
            onPointerLeave={props.onPointerLeave}
        >
            <table className="text-xs w-full border-separate border-spacing-2">
                <tbody>
                    {Object.entries(props.details).map(([key, value]) => (
                        <tr key={key}>
                            <td className="text-gray-600 font-bold">{key}</td>
                            <td>{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
