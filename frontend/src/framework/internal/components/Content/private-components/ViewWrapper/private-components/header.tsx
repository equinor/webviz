import React from "react";
import ReactDOM from "react-dom";

import { ModuleInstance } from "@framework/ModuleInstance";
import {
    ModuleInstanceStatusControllerLogEntry,
    ModuleInstanceStatusControllerLogEntryType,
} from "@framework/ModuleInstanceStatusController";
import { SyncSettingKey, SyncSettingsMeta } from "@framework/SyncSettings";
import { ModuleInstaceStatusControllerTopics } from "@framework/internal/ModuleInstanceStatusControllerPrivate";
import { Badge } from "@lib/components/Badge";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { isDevMode } from "@lib/utils/devMode";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Close, Error, Warning } from "@mui/icons-material";

export type HeaderProps = {
    moduleInstance: ModuleInstance<any>;
    isDragged: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onRemoveClick: (event: React.PointerEvent<HTMLDivElement>) => void;
};

export const Header: React.FC<HeaderProps> = (props) => {
    const [syncedSettings, setSyncedSettings] = React.useState<SyncSettingKey[]>(
        props.moduleInstance.getSyncedSettingKeys()
    );
    const [title, setTitle] = React.useState<string>(props.moduleInstance.getTitle());
    const [isLoading, setIsLoading] = React.useState<boolean>(props.moduleInstance.getStatusController().isLoading());
    const [logEntries, setLogEntries] = React.useState<ModuleInstanceStatusControllerLogEntry[]>([]);
    const [logVisible, setLogVisible] = React.useState<boolean>(false);

    const ref = React.useRef<HTMLDivElement>(null);
    const boundingRect = useElementBoundingRect(ref);

    React.useEffect(function handleMount() {
        function handleSyncedSettingsChange(newSyncedSettings: SyncSettingKey[]) {
            setSyncedSettings([...newSyncedSettings]);
        }

        function handleTitleChange(newTitle: string) {
            setTitle(newTitle);
        }

        function handleLoadingChange() {
            setIsLoading(props.moduleInstance.getStatusController().isLoading());
        }

        function handleLogEntriesChanges() {
            setLogEntries([...props.moduleInstance.getStatusController().getLogEntries()]);
        }

        const unsubscribeFromSyncSettingsChange =
            props.moduleInstance.subscribeToSyncedSettingKeysChange(handleSyncedSettingsChange);
        const unsubscribeFromTitleChange = props.moduleInstance.subscribeToTitleChange(handleTitleChange);
        const unsubscribeFromLoadingChange = props.moduleInstance
            .getStatusController()
            .subscribeToTopic(ModuleInstaceStatusControllerTopics.LoadingStateChange, handleLoadingChange);
        const unsubscribeFromLogEntriesChange = props.moduleInstance
            .getStatusController()
            .subscribeToTopic(ModuleInstaceStatusControllerTopics.LogChange, handleLogEntriesChanges);

        return function handleUnmount() {
            unsubscribeFromSyncSettingsChange();
            unsubscribeFromTitleChange();
            unsubscribeFromLoadingChange();
            unsubscribeFromLogEntriesChange();
        };
    }, []);

    function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
        props.onPointerDown(e);
        setLogVisible(false);
    }

    function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
        e.stopPropagation();
    }

    function handleStatusPointerDown(e: React.PointerEvent<HTMLDivElement>) {
        setLogVisible(!logVisible);
        e.stopPropagation();
    }

    function makeStatusIndicator(): React.ReactNode {
        const stateIndicators: React.ReactNode[] = [];

        if (isLoading) {
            stateIndicators.push(
                <div
                    className="flex items-center justify-center h-full p-1 cursor-help"
                    title="This module is currently loading new content."
                >
                    <CircularProgress size="medium-small" />
                </div>
            );
        }
        const numErrors = logEntries.filter(
            (entry) => entry.type === ModuleInstanceStatusControllerLogEntryType.Error
        ).length;
        const numWarnings = logEntries.filter(
            (entry) => entry.type === ModuleInstanceStatusControllerLogEntryType.Warning
        ).length;

        if (numErrors > 0 || numWarnings > 0) {
            stateIndicators.push(
                <div
                    className={resolveClassNames(
                        "flex items-center justify-center cursor-pointer h-full p-1 hover:bg-blue-100",
                        { "bg-blue-300 hover:bg-blue-400": logVisible }
                    )}
                    onPointerDown={handleStatusPointerDown}
                >
                    <Badge badgeContent={numErrors + numWarnings} className="flex">
                        <Error
                            fontSize="medium"
                            color="error"
                            style={{ display: numErrors === 0 ? "none" : "block" }}
                        />
                        <div className="overflow-hidden h-full">
                            <Warning
                                fontSize="medium"
                                color="warning"
                                style={{ display: numWarnings === 0 ? "none" : "block" }}
                                className={resolveClassNames({
                                    "-ml-3": numErrors > 0,
                                })}
                            />
                        </div>
                    </Badge>
                </div>
            );
        }

        if (stateIndicators.length === 0) return null;

        return (
            <div className="h-full flex items-center justify-center">
                {stateIndicators}
                <span className="bg-slate-300 w-[1px] h-3/4 ml-2" />
            </div>
        );
    }

    function makeLogEntries(): React.ReactNode {
        return (
            <div className="flex flex-col p-2 gap-2">
                {logEntries.map((entry, i) => (
                    <div key={entry.message} className="flex items-center gap-2">
                        {entry.type === ModuleInstanceStatusControllerLogEntryType.Error && (
                            <Error fontSize="small" color="error" />
                        )}
                        {entry.type === ModuleInstanceStatusControllerLogEntryType.Warning && (
                            <Warning fontSize="small" color="warning" />
                        )}
                        <span
                            className="ml-2 overflow-hidden text-ellipsis min-w-0 whitespace-nowrap"
                            title={entry.message}
                        >
                            {entry.message}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div
            className={`bg-slate-100 flex items-center select-none shadow ${
                props.isDragged ? "cursor-grabbing" : "cursor-move"
            }`}
            onPointerDown={handlePointerDown}
            ref={ref}
        >
            {makeStatusIndicator()}
            <div className="flex-grow flex items-center text-sm font-bold min-w-0 p-2">
                <span title={title} className="flex-grow text-ellipsis whitespace-nowrap overflow-hidden min-w-0">
                    {title}
                </span>
                {isDevMode() && (
                    <span
                        title={props.moduleInstance.getId()}
                        className="font-light ml-4 mr-4 text-ellipsis whitespace-nowrap overflow-hidden min-w-0"
                    >
                        {props.moduleInstance.getId()}
                    </span>
                )}
                <>
                    {syncedSettings.map((setting) => (
                        <span
                            key={setting}
                            className="flex items-center justify-center rounded p-1 leading-none bg-indigo-700 text-white ml-2 text-xs mr-2 cursor-help"
                            title={`This module syncs its "${SyncSettingsMeta[setting].name}" setting on the current page.`}
                        >
                            {SyncSettingsMeta[setting].abbreviation}
                        </span>
                    ))}
                </>
                <div
                    className="hover:text-slate-500 cursor-pointer"
                    onPointerDown={props.onRemoveClick}
                    onPointerUp={handlePointerUp}
                    title="Remove this module"
                >
                    <Close className="w-4 h-4" />
                </div>
            </div>
            {logVisible &&
                ReactDOM.createPortal(
                    <div
                        className={"absolute shadow min-w-[200px] z-40 bg-white overflow-hidden"}
                        style={{ top: boundingRect.bottom, left: boundingRect.left, maxWidth: boundingRect.width }}
                    >
                        {makeLogEntries()}
                    </div>,
                    document.body
                )}
        </div>
    );
};
