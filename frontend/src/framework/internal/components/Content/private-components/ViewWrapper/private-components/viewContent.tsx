import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstance, ModuleInstanceState } from "@framework/ModuleInstance";
import { StatusSource } from "@framework/ModuleInstanceStatusController";
import { Workbench } from "@framework/Workbench";
import { DebugProfiler } from "@framework/internal/components/DebugProfiler";
import { ErrorBoundary } from "@framework/internal/components/ErrorBoundary";
import { HydrateQueryClientAtom } from "@framework/internal/components/HydrateQueryClientAtom";
import { CircularProgress } from "@lib/components/CircularProgress";

import { Provider } from "jotai";

import { CrashView } from "./crashView";

type ViewContentProps = {
    moduleInstance: ModuleInstance<any, any, any, any>;
    workbench: Workbench;
};

export const ViewContent = React.memo((props: ViewContentProps) => {
    const [importState, setImportState] = React.useState<ImportState>(props.moduleInstance.getImportState());
    const [moduleInstanceState, setModuleInstanceState] = React.useState<ModuleInstanceState>(
        ModuleInstanceState.INITIALIZING
    );

    const atomStore = props.moduleInstance.getAtomStore();

    React.useEffect(
        function handleMount() {
            setModuleInstanceState(props.moduleInstance.getModuleInstanceState());
            setImportState(props.moduleInstance.getImportState());

            function handleModuleInstanceImportStateChange() {
                setImportState(props.moduleInstance.getImportState());
            }

            function handleModuleInstanceStateChange() {
                setModuleInstanceState(props.moduleInstance.getModuleInstanceState());
            }

            const unsubscribeFromImportStateChange = props.moduleInstance.subscribeToImportStateChange(
                handleModuleInstanceImportStateChange
            );

            const unsubscribeFromModuleInstanceStateChange = props.moduleInstance.subscribeToModuleInstanceStateChange(
                handleModuleInstanceStateChange
            );

            return function handleUnmount() {
                unsubscribeFromImportStateChange();
                unsubscribeFromModuleInstanceStateChange();
            };
        },
        [props.moduleInstance]
    );

    const handleModuleInstanceReload = React.useCallback(
        function handleModuleInstanceReload() {
            props.moduleInstance.reset().then(() => {
                setModuleInstanceState(props.moduleInstance.getModuleInstanceState());
            });
        },
        [props.moduleInstance]
    );

    if (importState === ImportState.NotImported) {
        return <div className="h-full w-full flex justify-center items-center">Not imported</div>;
    }

    if (importState === ImportState.Importing) {
        return (
            <div className="h-full w-full flex flex-col justify-center items-center">
                <CircularProgress />
                <div className="mt-4">Importing...</div>
            </div>
        );
    }

    if (!props.moduleInstance.isInitialized()) {
        return (
            <div className="h-full w-full flex flex-col justify-center items-center">
                <CircularProgress />
                <div className="mt-4">Initializing...</div>
            </div>
        );
    }

    if (importState === ImportState.Failed) {
        return (
            <div className="h-full w-full flex justify-center items-center">
                Module could not be imported. Please check the spelling when registering and initializing the module.
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
            <div className="p-2 h-full w-full">
                <DebugProfiler
                    id={`${props.moduleInstance.getId()}-view`}
                    statusController={props.moduleInstance.getStatusController()}
                    source={StatusSource.View}
                    guiMessageBroker={props.workbench.getGuiMessageBroker()}
                >
                    <Provider store={atomStore}>
                        <HydrateQueryClientAtom>
                            <View
                                viewContext={props.moduleInstance.getContext()}
                                workbenchSession={props.workbench.getWorkbenchSession()}
                                workbenchServices={props.workbench.getWorkbenchServices()}
                                workbenchSettings={props.workbench.getWorkbenchSettings()}
                                initialSettings={props.moduleInstance.getInitialSettings() || undefined}
                            />
                        </HydrateQueryClientAtom>
                    </Provider>
                </DebugProfiler>
            </div>
        </ErrorBoundary>
    );
});

ViewContent.displayName = "ViewWrapper";
