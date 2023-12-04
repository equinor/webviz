import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstance, ModuleInstanceState } from "@framework/ModuleInstance";
import { StatusSource } from "@framework/ModuleInstanceStatusController";
import { Workbench } from "@framework/Workbench";
import { ErrorBoundary } from "@framework/internal/components/ErrorBoundary";
import { useImportState } from "@framework/internal/hooks/moduleHooks";
import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Settings as SettingsIcon } from "@mui/icons-material";

import { DebugProfiler } from "../../DebugProfiler";

type SettingProps = {
    moduleInstance: ModuleInstance<any>;
    activeModuleInstanceId: string;
    workbench: Workbench;
};

export const Setting: React.FC<SettingProps> = (props) => {
    const importState = useImportState(props.moduleInstance);
    const [moduleInstanceState, setModuleInstanceState] = React.useState<ModuleInstanceState>(
        ModuleInstanceState.INITIALIZING
    );

    React.useEffect(() => {
        setModuleInstanceState(props.moduleInstance.getModuleInstanceState());

        function handleModuleInstanceStateChange() {
            setModuleInstanceState(props.moduleInstance.getModuleInstanceState());
        }

        const unsubscribeFunc = props.moduleInstance.subscribeToModuleInstanceStateChange(
            handleModuleInstanceStateChange
        );

        return unsubscribeFunc;
    }, []);

    if (importState !== ImportState.Imported || !props.moduleInstance.isInitialised()) {
        return null;
    }

    if (
        moduleInstanceState === ModuleInstanceState.INITIALIZING ||
        moduleInstanceState === ModuleInstanceState.RESETTING
    ) {
        const text = moduleInstanceState === ModuleInstanceState.INITIALIZING ? "Initializing..." : "Resetting...";
        return (
            <div className="h-full w-full flex flex-col justify-center items-center">
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
                    className="text-red-600"
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
                <div className="flex flex-col gap-4 overflow-auto">
                    <div className="p-2">
                        <DebugProfiler
                            id={`${props.moduleInstance.getId()}-settings`}
                            source={StatusSource.Settings}
                            statusController={props.moduleInstance.getStatusController()}
                            guiMessageBroker={props.workbench.getGuiMessageBroker()}
                        >
                            <Settings
                                moduleContext={props.moduleInstance.getContext()}
                                workbenchSession={props.workbench.getWorkbenchSession()}
                                workbenchServices={props.workbench.getWorkbenchServices()}
                                workbenchSettings={props.workbench.getWorkbenchSettings()}
                                initialSettings={props.moduleInstance.getInitialSettings() || undefined}
                            />
                        </DebugProfiler>
                    </div>
                </div>
            </ErrorBoundary>
        </div>
    );
};
