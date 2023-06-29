import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstance, ModuleInstanceState } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { ErrorBoundary } from "@framework/components/ErrorBoundary";
import { useImportState } from "@framework/hooks/moduleHooks";
import { CircularProgress } from "@lib/components/CircularProgress";

type SettingProps = {
    moduleInstance: ModuleInstance<any>;
    activeModuleId: string;
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
                        display: props.activeModuleId === props.moduleInstance.getId() ? "flex" : "none",
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
            style={{
                display: props.activeModuleId === props.moduleInstance.getId() ? "flex" : "none",
            }}
            className="flex-col gap-4"
        >
            <ErrorBoundary moduleInstance={props.moduleInstance}>
                <Settings
                    moduleContext={props.moduleInstance.getContext()}
                    workbenchSession={props.workbench.getWorkbenchSession()}
                    workbenchServices={props.workbench.getWorkbenchServices()}
                    presetProps={props.moduleInstance.getPresetProps() || undefined}
                />
            </ErrorBoundary>
        </div>
    );
};
