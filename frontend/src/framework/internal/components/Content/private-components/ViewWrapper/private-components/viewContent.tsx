import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstance, ModuleInstanceState } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { ErrorBoundary } from "@framework/internal/components/ErrorBoundary";
import { CircularProgress } from "@lib/components/CircularProgress";

import { CrashView } from "./crashView";

type ViewContentProps = {
    moduleInstance: ModuleInstance<any>;
    workbench: Workbench;
};

export const ViewContent = React.memo((props: ViewContentProps) => {
    const [importState, setImportState] = React.useState<ImportState>(ImportState.NotImported);
    const [moduleInstanceState, setModuleInstanceState] = React.useState<ModuleInstanceState>(
        ModuleInstanceState.INITIALIZING
    );

    React.useEffect(() => {
        setImportState(props.moduleInstance.getImportState());

        function handleModuleInstanceImportStateChange() {
            setImportState(props.moduleInstance.getImportState());
        }

        const unsubscribeFunc = props.moduleInstance.subscribeToImportStateChange(
            handleModuleInstanceImportStateChange
        );

        return unsubscribeFunc;
    }, []);

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

    const handleModuleInstanceReload = React.useCallback(() => {
        props.moduleInstance.reset().then(() => {
            setModuleInstanceState(props.moduleInstance.getModuleInstanceState());
        });
    }, [props.moduleInstance]);

    if (importState === ImportState.NotImported) {
        return <div className="h-full w-full flex justify-center items-center">Not imported</div>;
    }

    if (importState === ImportState.Importing || !props.moduleInstance.isInitialised()) {
        return (
            <div className="h-full w-full flex flex-col justify-center items-center">
                <CircularProgress />
                <div className="mt-4">Importing...</div>
            </div>
        );
    }

    if (importState === ImportState.Failed) {
        return (
            <div className="h-full w-full flex justify-center items-center">
                Module could not be imported. Please check the spelling when registering and initialising the module.
            </div>
        );
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
                <CrashView
                    moduleName={props.moduleInstance.getModule().getName()}
                    error={errorObject.err}
                    errorInfo={errorObject.errInfo}
                    onReload={handleModuleInstanceReload}
                />
            );
        }
    }

    const View = props.moduleInstance.getViewFC();
    return (
        <ErrorBoundary moduleInstance={props.moduleInstance}>
            <div className="p-4 h-full w-full">
                <View
                    moduleContext={props.moduleInstance.getContext()}
                    workbenchSession={props.workbench.getWorkbenchSession()}
                    workbenchServices={props.workbench.getWorkbenchServices()}
                    workbenchSettings={props.workbench.getWorkbenchSettings()}
                    initialSettings={props.moduleInstance.getInitialSettings() || undefined}
                />
            </div>
        </ErrorBoundary>
    );
});

ViewContent.displayName = "ViewWrapper";
