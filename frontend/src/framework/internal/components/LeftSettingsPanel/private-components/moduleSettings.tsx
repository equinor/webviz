import type React from "react";

import { Provider } from "jotai";

import { ErrorBoundary } from "@framework/internal/components/ErrorBoundary";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { ImportStatus } from "@framework/Module";
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
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";
import { useActiveSession } from "../../ActiveSessionBoundary";
import { ApplyInterfaceEffectsToSettings } from "../../ApplyInterfaceEffects/applyInterfaceEffects";
import { DebugProfiler } from "../../DebugProfiler";
import { HydrateQueryClientAtom } from "../../HydrateQueryClientAtom";

type ModuleSettingsProps = {
    workbench: Workbench;
    moduleInstance: ModuleInstance<any, any>;
    warningText?: string | null;
    isWarningVisible?: boolean;
    dismissWarning?: () => void;
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
                {props.isWarningVisible && props.warningText && (
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 text-yellow-800 rounded text-sm">
                        <div className="flex flex-col">
                            <span>
                                <strong>Note:</strong> {props.warningText}
                            </span>
                            <strong className="cursor-pointer self-end" onClick={props.dismissWarning}>
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
                <div className="flex flex-col gap-4 overflow-auto grow">
                    <div className="p-2 grow">{makeContent()}</div>
                </div>
            </ErrorBoundary>
        </div>
    );
};
