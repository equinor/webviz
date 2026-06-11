import React from "react";

import { Provider } from "jotai";

import { useActiveSession } from "@framework/internal/components/ActiveSessionBoundary";
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
import { type Workbench } from "@framework/Workbench";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { Paragraph } from "@lib/newComponents/Typography/compositions";

import { CrashView } from "./crashView";

type ViewContentProps = {
    moduleInstance: ModuleInstance<any, any>;
    workbench: Workbench;
};

export const ViewContent = React.memo((props: ViewContentProps) => {
    const workbenchSession = useActiveSession();
    const importState = useModuleInstanceTopicValue(props.moduleInstance, ModuleInstanceTopic.IMPORT_STATUS);
    const moduleInstanceLifeCycleState = useModuleInstanceTopicValue(
        props.moduleInstance,
        ModuleInstanceTopic.LIFECYCLE_STATE,
    );
    const moduleInstanceViewStateInvalid = useModuleInstanceTopicValue(
        props.moduleInstance,
        ModuleInstanceTopic.HAS_INVALID_PERSISTED_VIEW,
    );

    const handleModuleInstanceReload = React.useCallback(
        function handleModuleInstanceReload() {
            props.moduleInstance.reset();
        },
        [props.moduleInstance],
    );

    function makeStateRelatedContent(): React.ReactNode {
        if (importState === ImportStatus.NotImported) {
            return (
                <Paragraph size="md" tone="warning">
                    Module not imported. Please check the spelling when registering and initializing the module.
                </Paragraph>
            );
        }

        if (importState === ImportStatus.Importing) {
            return (
                <>
                    <CircularProgress size={32} />
                    <Paragraph size="md">Importing...</Paragraph>
                </>
            );
        }

        if (!props.moduleInstance.isInitialized()) {
            return (
                <>
                    <CircularProgress size={32} />
                    <Paragraph size="md">Initializing...</Paragraph>
                </>
            );
        }

        if (importState === ImportStatus.Failed) {
            return (
                <Paragraph size="md" tone="warning">
                    Module could not be imported. Please check the spelling when registering and initializing the
                    module.
                </Paragraph>
            );
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
                    <CircularProgress size={32} />
                    <Paragraph size="md">{text}</Paragraph>
                </>
            );
        }

        return null;
    }

    const stateRelatedContent = makeStateRelatedContent();
    if (stateRelatedContent) {
        return (
            <div className="gap-y-xs flex h-full w-full flex-col items-center justify-center">
                {stateRelatedContent}
            </div>
        );
    }

    if (moduleInstanceViewStateInvalid) {
        return (
            <div className="gap-y-xs px-xs py-xs flex h-full w-full flex-col items-center justify-center">
                <Paragraph
                    size="sm"
                    tone="warning"
                    layoutClassName="mx-2xs my-2xs text-center max-w-96"
                >
                    The persisted view state for this module&apos;s view is invalid and could not be applied. It has
                    most likely been outdated by a module update. You can reset the module to its default view to
                    continue using it.
                </Paragraph>
                <Button onClick={() => props.moduleInstance.resetInvalidPersistedFlags()} size="small">
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

    const atomStore = workbenchSession.getAtomStoreMaster().getAtomStoreForModuleInstance(props.moduleInstance.getId());
    if (!atomStore) {
        return null;
    }

    const View = props.moduleInstance.getViewFC();
    return (
        <ErrorBoundary moduleInstance={props.moduleInstance}>
            <div className="px-2xs py-2xs h-full w-full">
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
                                    workbenchSession={props.workbench.getSessionManager().getActiveSession()}
                                    workbenchServices={props.workbench.getWorkbenchServices()}
                                    hoverService={props.workbench.getHoverService()}
                                    workbenchSettings={props.workbench
                                        .getSessionManager()
                                        .getActiveSession()
                                        .getWorkbenchSettings()}
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
