import React from "react";

import { Provider } from "jotai";

import { ApplyInterfaceEffectsToView } from "@framework/internal/components/ApplyInterfaceEffects/applyInterfaceEffects";
import { DebugProfiler } from "@framework/internal/components/DebugProfiler";
import { ErrorBoundary } from "@framework/internal/components/ErrorBoundary";
import { HydrateQueryClientAtom } from "@framework/internal/components/HydrateQueryClientAtom";
import { ImportStatus } from "@framework/Module";
import type { ModuleInstance } from "@framework/ModuleInstance";
import {
    ModuleInstanceLifeCycleState,
    ModuleInstanceTopic,
    useModuleInstanceTopicValue,
} from "@framework/ModuleInstance";
import { StatusSource } from "@framework/ModuleInstanceStatusController";
import type { Workbench } from "@framework/Workbench";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";

import { CrashView } from "./crashView";

type ViewContentProps = {
    moduleInstance: ModuleInstance<any, any>;
    workbench: Workbench;
};

export const ViewContent = React.memo((props: ViewContentProps) => {
    const workbenchSession = props.workbench.getWorkbenchSession();
    const importState = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.IMPORT_STATUS);
    const moduleInstanceLifeCycleState = useModuleInstanceTopicValue(
        props.moduleInstance,
        ModuleInstanceTopic.LIFECYCLE_STATE,
    );

    const atomStore = workbenchSession.getAtomStoreMaster().getAtomStoreForModuleInstance(props.moduleInstance.getId());

    const handleModuleInstanceReload = React.useCallback(
        function handleModuleInstanceReload() {
            props.moduleInstance.reset();
        },
        [props.moduleInstance],
    );

    function makeStateRelatedContent(): React.ReactNode {
        if (importState === ImportStatus.NotImported) {
            return "Module not imported. Please check the spelling when registering and initializing the module.";
        }

        if (importState === ImportStatus.Importing) {
            return (
                <>
                    <CircularProgress />
                    <div className="mt-4">Importing...</div>
                </>
            );
        }

        if (!props.moduleInstance.isInitialized()) {
            return (
                <>
                    <CircularProgress />
                    <div className="mt-4">Initializing...</div>
                </>
            );
        }

        if (importState === ImportStatus.Failed) {
            return "Module could not be imported. Please check the spelling when registering and initializing the module.";
        }

        if (
            moduleInstanceLifeCycleState === ModuleInstanceLifeCycleState.INITIALIZING ||
            moduleInstanceLifeCycleState === ModuleInstanceLifeCycleState.RESETTING
        ) {
            const text =
                moduleInstanceLifeCycleState === ModuleInstanceLifeCycleState.INITIALIZING
                    ? "Initializing..."
                    : "Resetting...";
            return (
                <>
                    <CircularProgress />
                    <div className="mt-4">{text}</div>
                </>
            );
        }

        return false;
    }

    const stateRelatedContent = makeStateRelatedContent();
    if (stateRelatedContent) {
        return <div className="h-full w-full flex flex-col justify-center items-center">{stateRelatedContent}</div>;
    }

    if (moduleInstanceLifeCycleState === ModuleInstanceLifeCycleState.ERROR) {
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
                            <ApplyInterfaceEffectsToView moduleInstance={props.moduleInstance}>
                                <View
                                    viewContext={props.moduleInstance.getContext()}
                                    workbenchSession={
                                        props.workbench.getWorkbenchSession() as unknown as WorkbenchSession
                                    }
                                    workbenchServices={props.workbench.getWorkbenchServices()}
                                    workbenchSettings={props.workbench.getWorkbenchSession().getWorkbenchSettings()}
                                    initialSettings={props.moduleInstance.getInitialSettings() || undefined}
                                />
                            </ApplyInterfaceEffectsToView>
                        </HydrateQueryClientAtom>
                    </Provider>
                </DebugProfiler>
            </div>
        </ErrorBoundary>
    );
});

ViewContent.displayName = "ViewWrapper";
