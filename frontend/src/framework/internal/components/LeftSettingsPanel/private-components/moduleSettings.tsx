import React from "react";

import { Settings as SettingsIcon, WarningRounded } from "@mui/icons-material";
import { Provider } from "jotai";

import { ErrorBoundary } from "@framework/internal/components/ErrorBoundary";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { ImportStatus, ModuleDevState } from "@framework/Module";
import type { ModuleInstance } from "@framework/ModuleInstance";
import {
    ModuleInstanceTopic,
    ModuleInstanceLifeCycleState,
    useModuleInstanceTopicValue,
} from "@framework/ModuleInstance";
import { StatusSource } from "@framework/ModuleInstanceStatusController";
import { type Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";
import { useActiveSession } from "../../ActiveSessionBoundary";
import { ApplyInterfaceEffectsToSettings } from "../../ApplyInterfaceEffects/applyInterfaceEffects";
import { DebugProfiler } from "../../DebugProfiler";
import { HydrateQueryClientAtom } from "../../HydrateQueryClientAtom";

type ModuleSettingsProps = {
    moduleInstance: ModuleInstance<any, any>;
    workbench: Workbench;
};

export const ModuleSettings: React.FC<ModuleSettingsProps> = (props) => {
    const workbenchSession = useActiveSession();
    const importState = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.IMPORT_STATUS);
    const dashboard = useActiveDashboard();

    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);

    const moduleInstanceLifecycleState = useModuleInstanceTopicValue(
        props.moduleInstance,
        ModuleInstanceTopic.LIFECYCLE_STATE,
    );

    const moduleInstanceSettingsStateInvalid = useModuleInstanceTopicValue(
        props.moduleInstance,
        ModuleInstanceTopic.HAS_INVALID_PERSISTED_SETTINGS,
    );

    const moduleWarningClosedKey = `module-warning-closed-${props.moduleInstance.getId()}`;
    const isSerializable = props.moduleInstance.getModule().canBeSerialized();
    const isDevModule = props.moduleInstance.getModule().getDevState() === ModuleDevState.DEV;

    const moduleWarningText: string | null = React.useMemo(
        function makeModuleWarningText() {
            if (!isSerializable && isDevModule) {
                return "This module is under development and without persistence. Major changes can occur without warning, and state changes will not be saved.";
            } else if (isDevModule) {
                return "This module is under development. Major changes can occur without warning.";
            } else if (!isSerializable) {
                return "This module cannot be persisted yet. State changes will not be saved.";
            }
            return null;
        },
        [isSerializable, isDevModule],
    );

    const [isWarningTextOpen, setIsWarningTextOpen] = React.useState(
        localStorage.getItem(moduleWarningClosedKey) !== "true" && (!isSerializable || isDevModule),
    );

    if (importState !== ImportStatus.Imported || !props.moduleInstance.isInitialized()) {
        return null;
    }

    if (
        moduleInstanceLifecycleState === ModuleInstanceLifeCycleState.INITIALIZING ||
        moduleInstanceLifecycleState === ModuleInstanceLifeCycleState.RESETTING
    ) {
        const text =
            moduleInstanceLifecycleState === ModuleInstanceLifeCycleState.INITIALIZING
                ? "Initializing..."
                : "Resetting...";
        return (
            <div className="h-full w-full flex flex-col justify-center items-center m-2">
                <CircularProgress />
                <div className="mt-4">{text}</div>
            </div>
        );
    }

    if (moduleInstanceLifecycleState === ModuleInstanceLifeCycleState.ERROR) {
        const errorObject = props.moduleInstance.getFatalError();
        if (errorObject) {
            return (
                <div
                    className="text-red-600 m-2"
                    style={{
                        display: activeModuleInstanceId === props.moduleInstance.getId() ? "flex" : "none",
                    }}
                >
                    This module instance has encountered an error. Please see its view for more details.
                </div>
            );
        }
    }

    function handleCloseWarningText() {
        if (!isWarningTextOpen) {
            return;
        }

        setIsWarningTextOpen(false);
        localStorage.setItem(moduleWarningClosedKey, "true");
    }

    function handleOpenWarningText() {
        if (isWarningTextOpen) {
            return;
        }

        setIsWarningTextOpen(true);
        localStorage.removeItem(moduleWarningClosedKey);
    }

    function makeContent() {
        if (moduleInstanceSettingsStateInvalid) {
            return (
                <div className="flex flex-col gap-4 h-full w-full justify-center items-center">
                    <div className="text-red-600 m-2 text-center">
                        The persisted settings for this module&apos;s settings are invalid and could not be applied.
                        They have most likely been outdated by a module update. You can reset the module to its default
                        values to continue using it.
                    </div>
                    <Button onClick={() => props.moduleInstance.resetInvalidPersistedFlags()} variant="contained">
                        Reset module
                    </Button>
                </div>
            );
        }

        const atomStore = workbenchSession
            .getAtomStoreMaster()
            .getAtomStoreForModuleInstance(props.moduleInstance.getId());

        if (!atomStore) {
            return null;
        }

        return (
            <>
                {isWarningTextOpen && moduleWarningText && (
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-sm">
                        <div className="flex flex-col">
                            <span>
                                <strong>Note:</strong> {moduleWarningText}
                            </span>
                            <strong className="cursor-pointer self-end" onClick={handleCloseWarningText}>
                                Close [X]
                            </strong>
                        </div>
                    </div>
                )}
                <DebugProfiler
                    id={`${props.moduleInstance.getId()}-settings`}
                    source={StatusSource.Settings}
                    statusController={props.moduleInstance.getStatusController()}
                    guiMessageBroker={props.workbench.getGuiMessageBroker()}
                >
                    <Provider store={atomStore}>
                        <HydrateQueryClientAtom>
                            <ApplyInterfaceEffectsToSettings moduleInstance={props.moduleInstance}>
                                <Settings
                                    settingsContext={props.moduleInstance.getContext()}
                                    workbenchSession={props.workbench.getSessionManager().getActiveSession()}
                                    workbenchServices={props.workbench.getWorkbenchServices()}
                                    workbenchSettings={props.workbench
                                        .getSessionManager()
                                        .getActiveSession()
                                        .getWorkbenchSettings()}
                                    initialSettings={props.moduleInstance.getInitialSettings() || undefined}
                                />
                            </ApplyInterfaceEffectsToSettings>
                        </HydrateQueryClientAtom>
                    </Provider>
                </DebugProfiler>
            </>
        );
    }

    const Settings = props.moduleInstance.getSettingsFC();
    return (
        <div
            key={props.moduleInstance.getId()}
            className={resolveClassNames(
                activeModuleInstanceId === props.moduleInstance.getId() ? "flex" : "hidden",
                "flex-col h-full w-full relative",
            )}
            style={{ contain: "content" }}
        >
            <ErrorBoundary moduleInstance={props.moduleInstance}>
                <div className="flex justify-center items-center p-2 bg-slate-100 h-10 shadow-sm">
                    <SettingsIcon fontSize="small" className="mr-2" />{" "}
                    <span
                        title={props.moduleInstance.getTitle()}
                        className="font-bold grow p-0 text-ellipsis whitespace-nowrap overflow-hidden text-sm"
                    >
                        {props.moduleInstance.getTitle()}
                    </span>
                    {moduleWarningText && (
                        <Tooltip
                            title={`The module has a warning${isWarningTextOpen ? "" : " (click to open)"}`}
                            enterDelay="medium"
                        >
                            <WarningRounded
                                fontSize="small"
                                className={
                                    isWarningTextOpen ? "text-slate-400" : "text-yellow-500 rounded cursor-pointer"
                                }
                                onClick={handleOpenWarningText}
                            />
                        </Tooltip>
                    )}
                </div>
                <div className="flex flex-col gap-4 overflow-auto grow">
                    <div className="p-2 grow">{makeContent()}</div>
                </div>
            </ErrorBoundary>
        </div>
    );
};
