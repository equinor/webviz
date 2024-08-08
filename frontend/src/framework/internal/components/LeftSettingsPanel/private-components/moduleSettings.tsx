import React from "react";

import { ImportState } from "@framework/Module";
import {
    ModuleInstance,
    ModuleInstanceState,
    ModuleInstanceTopic,
    useModuleInstanceTopicValue,
} from "@framework/ModuleInstance";
import { StatusSource } from "@framework/ModuleInstanceStatusController";
import { Workbench } from "@framework/Workbench";
import { ErrorBoundary } from "@framework/internal/components/ErrorBoundary";
import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Settings as SettingsIcon } from "@mui/icons-material";

import { Provider } from "jotai";

import { ApplyInterfaceEffectsToSettings } from "../../ApplyInterfaceEffects/applyInterfaceEffects";
import { DebugProfiler } from "../../DebugProfiler";
import { HydrateQueryClientAtom } from "../../HydrateQueryClientAtom";

type ModuleSettingsProps = {
    moduleInstance: ModuleInstance<any>;
    activeModuleInstanceId: string;
    workbench: Workbench;
};

export const ModuleSettings: React.FC<ModuleSettingsProps> = (props) => {
    const importState = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.IMPORT_STATE);
    const moduleInstanceState = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.STATE);
    const atomStore = props.workbench.getAtomStoreMaster().getAtomStoreForModuleInstance(props.moduleInstance.getId());

    if (importState !== ImportState.Imported || !props.moduleInstance.isInitialized()) {
        return null;
    }

    if (
        moduleInstanceState === ModuleInstanceState.INITIALIZING ||
        moduleInstanceState === ModuleInstanceState.RESETTING
    ) {
        const text = moduleInstanceState === ModuleInstanceState.INITIALIZING ? "Initializing..." : "Resetting...";
        return (
            <div className="h-full w-full flex flex-col justify-center items-center m-2">
                <CircularProgress />
                <div className="mt-4">{text}</div>
            </div>
        );
    }

    if (moduleInstanceState === ModuleInstanceState.ERROR) {
        const errorObject = props.moduleInstance.getFatalError();
        if (errorObject) {
            return (
                <div
                    className="text-red-600 m-2"
                    style={{
                        display: props.activeModuleInstanceId === props.moduleInstance.getId() ? "flex" : "none",
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
                props.activeModuleInstanceId === props.moduleInstance.getId() ? "flex" : "hidden",
                "flex-col h-full w-full relative"
            )}
            style={{ contain: "content" }}
        >
            <ErrorBoundary moduleInstance={props.moduleInstance}>
                <div className="flex justify-center items-center p-2 bg-slate-100 h-10">
                    <SettingsIcon fontSize="small" className="mr-2" />{" "}
                    <span
                        title={props.moduleInstance.getTitle()}
                        className="font-bold flex-grow p-0 text-ellipsis whitespace-nowrap overflow-hidden text-sm"
                    >
                        {props.moduleInstance.getTitle()}
                    </span>
                </div>
                <div className="flex flex-col gap-4 overflow-auto flex-grow">
                    <div className="p-2 flex-grow">
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
                                            workbenchSession={props.workbench.getWorkbenchSession()}
                                            workbenchServices={props.workbench.getWorkbenchServices()}
                                            workbenchSettings={props.workbench.getWorkbenchSettings()}
                                            initialSettings={props.moduleInstance.getInitialSettings() || undefined}
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
