import type React from "react";

import { Settings as SettingsIcon } from "@mui/icons-material";
import { Provider } from "jotai";

import { DashboardTopic } from "@framework/internal/WorkbenchSession/Dashboard";
import { ErrorBoundary } from "@framework/internal/components/ErrorBoundary";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { ImportStatus } from "@framework/Module";
import type { ModuleInstance } from "@framework/ModuleInstance";
import {
    ModuleInstanceTopic,
    ModuleInstanceLifeCycleState,
    useModuleInstanceTopicValue,
} from "@framework/ModuleInstance";
import { StatusSource } from "@framework/ModuleInstanceStatusController";
import type { Workbench } from "@framework/Workbench";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ApplyInterfaceEffectsToSettings } from "../../ApplyInterfaceEffects/applyInterfaceEffects";
import { DebugProfiler } from "../../DebugProfiler";
import { HydrateQueryClientAtom } from "../../HydrateQueryClientAtom";

type ModuleSettingsProps = {
    moduleInstance: ModuleInstance<any, any>;
    workbench: Workbench;
};

export const ModuleSettings: React.FC<ModuleSettingsProps> = (props) => {
    const importState = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.IMPORT_STATUS);
    const dashboard = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );

    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ActiveModuleInstanceId);

    const moduleInstanceLifecycleState = useModuleInstanceTopicValue(
        props.moduleInstance,
        ModuleInstanceTopic.LIFECYCLE_STATE,
    );
    const atomStore = props.workbench.getAtomStoreMaster().getAtomStoreForModuleInstance(props.moduleInstance.getId());

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
                <div className="flex justify-center items-center p-2 bg-slate-100 h-10">
                    <SettingsIcon fontSize="small" className="mr-2" />{" "}
                    <span
                        title={props.moduleInstance.getTitle()}
                        className="font-bold grow p-0 text-ellipsis whitespace-nowrap overflow-hidden text-sm"
                    >
                        {props.moduleInstance.getTitle()}
                    </span>
                </div>
                <div className="flex flex-col gap-4 overflow-auto grow">
                    <div className="p-2 grow">
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
                                            workbenchSession={
                                                props.workbench.getWorkbenchSession() as unknown as WorkbenchSession
                                            }
                                            workbenchServices={props.workbench.getWorkbenchServices()}
                                            workbenchSettings={props.workbench
                                                .getWorkbenchSession()
                                                .getWorkbenchSettings()}
                                            initialSettings={props.moduleInstance.getInitialSettings() || undefined}
                                            persistence={{
                                                serializedState:
                                                    props.moduleInstance.getSerializedState()?.["settings"] ??
                                                    undefined,
                                                serializeState: props.moduleInstance.serializeSettingsState.bind(
                                                    props.moduleInstance,
                                                ),
                                            }}
                                        />
                                    </ApplyInterfaceEffectsToSettings>
                                </HydrateQueryClientAtom>
                            </Provider>
                        </DebugProfiler>
                    </div>
                </div>
            </ErrorBoundary>
        </div>
    );
};
