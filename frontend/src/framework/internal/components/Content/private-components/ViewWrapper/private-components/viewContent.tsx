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
import { WorkbenchTopic, type Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { CrashView } from "./crashView";

type ViewContentProps = {
    moduleInstance: ModuleInstance<any, any>;
    workbench: Workbench;
};

export const ViewContent = React.memo((props: ViewContentProps) => {
    const workbenchSession = usePublishSubscribeTopicValue(props.workbench, WorkbenchTopic.ACTIVE_SESSION);
    const importState = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.IMPORT_STATUS);
    const moduleInstanceLifeCycleState = useModuleInstanceTopicValue(
        props.moduleInstance,
        ModuleInstanceTopic.LIFECYCLE_STATE,
    );
    const moduleInstanceViewStateInvalid = useModuleInstanceTopicValue(
        props.moduleInstance,
        ModuleInstanceTopic.HAS_INVALID_PERSISTED_VIEW,
    );

    const atomStore = workbenchSession!
        .getAtomStoreMaster()
        .getAtomStoreForModuleInstance(props.moduleInstance.getId());

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

        return null;
    }

    const stateRelatedContent = makeStateRelatedContent();
    if (stateRelatedContent) {
        return <div className="h-full w-full flex flex-col justify-center items-center">{stateRelatedContent}</div>;
    }

    if (moduleInstanceViewStateInvalid) {
        return (
            <div className="flex flex-col gap-4 h-full w-full justify-center items-center">
                <div className="text-red-600 m-2">
                    The persisted view state for this module&apos;s view is invalid and could not be applied. It has
                    most likely been outdated by a module update. You can reset the module to its default view to
                    continue using it.
                </div>
                <Button onClick={() => props.moduleInstance.resetInvalidPersistedFlags()} variant="contained">
                    Reset module
                </Button>
            </div>
        );
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
                                    workbenchSession={props.workbench.getWorkbenchSession()}
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
