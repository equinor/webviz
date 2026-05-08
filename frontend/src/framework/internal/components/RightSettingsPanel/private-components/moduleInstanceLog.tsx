import React from "react";

import { CheckCircle, ClearAll, CloudDone, CloudDownload, Error, History, Warning } from "@mui/icons-material";

import { GuiState, RightDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import { Drawer } from "@framework/internal/components/Drawer";
import { DashboardTopic } from "@framework/internal/Dashboard";
import type { LogEntry } from "@framework/internal/ModuleInstanceStatusControllerInternal";
import {
    LogEntryType,
    useStatusControllerStateValue,
} from "@framework/internal/ModuleInstanceStatusControllerInternal";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { StatusMessageType } from "@framework/ModuleInstanceStatusController";
import type { Workbench } from "@framework/Workbench";
import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";
import { Tooltip } from "@lib/components/Tooltip";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";
import { Button } from "@lib/newComponents/Button";

export type ModuleInstanceLogProps = {
    workbench: Workbench;
    onClose: () => void;
};

export function ModuleInstanceLog(props: ModuleInstanceLogProps): React.ReactNode {
    const dashboard = useActiveDashboard();
    const [details, setDetails] = React.useState<Record<string, unknown> | null>(null);
    const [detailsPosY, setDetailsPosY] = React.useState<number>(0);
    const [pointerOverDetails, setPointerOverDetails] = React.useState<boolean>(false);

    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);
    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);
    const moduleInstance = activeModuleInstanceId ? dashboard.getModuleInstance(activeModuleInstanceId) : null;

    const ref = React.useRef<HTMLDivElement>(null);
    const boundingClientRect = useElementBoundingRect(ref);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
            <Tooltip title="Clear all messages">
                <Button onClick={handleClearAll} tone="danger" variant="text" iconOnly size="small">
                    <ClearAll fontSize="inherit" />
                </Button>
            </Tooltip>
        );
    }

    const handleShowDetails = React.useCallback(function handleShowDetails(
        details: Record<string, unknown>,
        posY: number,
    ) {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setDetails(details);
        setDetailsPosY(posY);
    }, []);

    const handleHideDetails = React.useCallback(
        function handleHideDetails() {
            if (pointerOverDetails) {
                return;
            }
            setDetails(null);
        },
        [pointerOverDetails],
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
        <div
            ref={ref}
            className={`w-full ${drawerContent === RightDrawerContent.ModuleInstanceLog ? "h-full" : "h-0"}`}
        >
            <Drawer
                title={makeTitle()}
                icon={<History />}
                visible={drawerContent === RightDrawerContent.ModuleInstanceLog}
                onClose={handleClose}
                actions={makeActions()}
            >
                <div className="px-horizontal-xs py-vertical-xs gap-vertical-4xs text-body-sm flex h-full flex-col overflow-y-auto">
                    {moduleInstance ? (
                        <LogList
                            moduleInstance={moduleInstance}
                            onShowDetails={handleShowDetails}
                            onHideDetails={handleHideDetails}
                        />
                    ) : (
                        <div className="text-neutral-subtle flex h-full w-full flex-col items-center justify-center">
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
                    />,
                )}
        </div>
    );
}

type LogListProps = {
    onShowDetails: (details: Record<string, unknown>, yPos: number) => void;
    onHideDetails: () => void;
    moduleInstance: ModuleInstance<any, any>;
};

function LogList(props: LogListProps): React.ReactNode {
    const log = useStatusControllerStateValue(props.moduleInstance.getStatusController(), "log");

    if (log.length === 0) {
        return (
            <div className="text-neutral-subtle flex h-full w-full flex-col items-center justify-center">
                No log entries
            </div>
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
                    <React.Fragment key={entry.id}>
                        {showDatetime && (
                            <div className="border-b-neutral px-horizontal-xs py-vertical-4xs text-neutral text-body-xs sticky border-b text-right">
                                {convertDatetimeMsToHumanReadableString(entry.datetimeMs)}
                            </div>
                        )}
                        <LogEntryComponent
                            logEntry={entry}
                            onShowDetails={props.onShowDetails}
                            onHideDetails={props.onHideDetails}
                        />
                    </React.Fragment>
                );
            })}
        </>
    );
}

type LogEntryProps = {
    logEntry: LogEntry;
    onShowDetails: (details: Record<string, unknown>, yPos: number) => void;
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
        [props.onHideDetails],
    );

    function handleShowDetails(e: React.MouseEvent<HTMLDivElement>) {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        const target = e.currentTarget;
        timeoutRef.current = setTimeout(() => {
            if (props.logEntry.type === LogEntryType.MESSAGE) {
                if (props.logEntry.message?.request && "query" in (props.logEntry.message?.request ?? {})) {
                    if (!(target instanceof HTMLElement)) {
                        return;
                    }
                    props.onShowDetails(
                        // @ts-expect-error - query is always present
                        props.logEntry.message.request["query"] ?? {},
                        target.getBoundingClientRect().top,
                    );
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

    let icon = <CloudDownload fontSize="inherit" className="text-neutral-subtle" />;
    let message = "Loading...";
    let detailsString: React.ReactNode = null;
    let detailsObject: Record<string, string> | null = null;
    if (props.logEntry.type === LogEntryType.MESSAGE) {
        if (props.logEntry.message?.type === StatusMessageType.Error) {
            icon = <Error fontSize="inherit" className="text-danger-subtle" />;
        } else if (props.logEntry.message?.type === StatusMessageType.Warning) {
            icon = <Warning fontSize="inherit" className="text-warning-subtle" />;
        }
        message = props.logEntry.message?.message ?? "";
        // @ts-expect-error - query is always present
        if (props.logEntry.message.request?.query) {
            const text = `${props.logEntry.message.request.method} ${props.logEntry.message.request.url}`;
            detailsString = (
                <div className="w-full overflow-hidden" title={text}>
                    <span className="text-neutral block max-w-0 text-xs text-ellipsis whitespace-nowrap">{text}</span>
                </div>
            );
            detailsObject = {};
            // @ts-expect-error - query is always present
            for (const key in props.logEntry.message.request.query) {
                // @ts-expect-error - query is always present
                const value = props.logEntry.message.request.query[key];
                detailsObject[key] = JSON.stringify(value);
            }
        }
    } else if (props.logEntry.type === LogEntryType.SUCCESS) {
        icon = <CheckCircle fontSize="inherit" className="text-green-subtle" />;
        message = "Data successfully loaded";
    } else if (props.logEntry.type === LogEntryType.LOADING_DONE) {
        icon = <CloudDone fontSize="inherit" className="text-blue-subtle" />;
        message = "Loading done";
    }

    return (
        <div
            className={resolveClassNames(
                "py-vertical-3xs px-horizontal-2xs group hover:text-neutral gap-horizontal-2xs hover:bg-accent-hover flex items-center",
                {
                    "cursor-help": Boolean(detailsObject),
                },
            )}
            onMouseEnter={handleShowDetails}
            onMouseLeave={handleHideDetails}
        >
            {icon}
            <span title={message} className="grow">
                {message}
                {detailsString}
            </span>
            <span className="text-body-xs group-hover:text-neutral text-transparent">
                {convertDatetimeMsToHumanReadableString(props.logEntry.datetimeMs, true)}
            </span>
        </div>
    );
}

type DetailsPopupProps = {
    details: Record<string, unknown>;
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
            className="absolute z-50 w-96 border border-gray-300 bg-white p-1 text-sm shadow-lg"
            style={style}
            onPointerEnter={props.onPointerEnter}
            onPointerLeave={props.onPointerLeave}
        >
            <table className="w-full border-separate border-spacing-2 text-xs">
                <tbody>
                    {Object.entries(props.details).map(([key, value]) => (
                        <tr key={key}>
                            <td className="font-bold text-gray-600">{key}</td>
                            <td>{JSON.stringify(value)}</td>
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
