import React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { ActiveSessionBoundary } from "@framework/internal/components/ActiveSessionBoundary";
import { LoadingOverlay } from "@framework/internal/components/LoadingOverlay";
import { SelectEnsemblesDialog } from "@framework/internal/components/SelectEnsemblesDialog";
import { SettingsContentPanels } from "@framework/internal/components/SettingsContentPanels";
import { TopBar } from "@framework/internal/components/TopBar/topBar";
import { WorkbenchSessionManagerTopic } from "@framework/internal/WorkbenchSession/WorkbenchSessionManager";
import { Workbench } from "@framework/Workbench";
import "../../../../modules/registerAllModules";
import "../../../../templates/registerAllTemplates";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useGlobalErrorBoundaryContext } from "../../../../GlobalErrorBoundary";
import { ActionBar } from "../ActionBar/actionBar";
import { ActiveDashboardBoundary } from "../ActiveDashboardBoundary";
import { ActiveSessionRecoveryDialog } from "../ActiveSessionRecoveryDialog/activeSessionRecoveryDialog";
import { BottomBar } from "../BottomBar";
import { CreateSnapshotDialog } from "../CreateSnapshotDialog/createSnapshotDialog";
import { DocumentTitleSync } from "../DocumentTitleSync";
import { InitialEnsemblesLoadingErrorInfoDialog } from "../InitialEnsemblesLoadingErrorInfoDialog";
import { InitialEnsemblesLoadingWarningInfoDialog } from "../InitialEnsemblesLoadingWarningInfoDialog";
import { MultiSessionsRecoveryDialog } from "../MultiSessionsRecoveryDialog";
import { PersistenceManagementDialog } from "../PersistenceManagementDialog";
import { RightSideBar } from "../RightSideBar";
import { SaveSessionDialog } from "../SaveSessionDialog";
import { SessionErrorDialog } from "../SessionErrorDialog";
import { StartPage } from "../StartPage/StartPage";
import { TemplatesDialog } from "../TemplatesDialog/templatesDialog";
import { TutorialsDialog } from "../TutorialsDialog/tutorialsDialog";

/**
 * Owns the workbench's lifecycle: a workbench is created when this component mounts and destroyed when it unmounts -
 * e.g. after a logout, as the authentication boundary only renders it while logged in. Created in an effect rather
 * than kept in state, so that every mount gets a workbench of its own - StrictMode mounts twice, unmounting in between.
 */
export function WorkbenchWrapper() {
    const queryClient = useQueryClient();
    const { registerActiveWorkbench, hasCrashed } = useGlobalErrorBoundaryContext();

    const [workbench, setWorkbench] = React.useState<Workbench | null>(null);
    const [initializedWorkbench, setInitializedWorkbench] = React.useState<Workbench | null>(null);

    React.useEffect(
        function createWorkbench() {
            const newWorkbench = new Workbench(queryClient);
            let isDestroyed = false;

            // Created here rather than during rendering, so that it is destroyed along with the mount that created it
            // eslint-disable-next-line @eslint-react/set-state-in-effect
            setWorkbench(newWorkbench);
            registerActiveWorkbench(newWorkbench);

            newWorkbench.initialize().then(() => {
                if (!isDestroyed) {
                    setInitializedWorkbench(newWorkbench);
                }
            });

            return function destroyWorkbench() {
                isDestroyed = true;
                registerActiveWorkbench(null);

                // After a crash, the error fallback still reads this workbench's session for the support documents
                if (!hasCrashed()) {
                    newWorkbench.beforeDestroy();
                }
            };
        },
        [queryClient, registerActiveWorkbench, hasCrashed],
    );

    if (!workbench) {
        return null;
    }

    return <WorkbenchContent workbench={workbench} isInitialized={initializedWorkbench === workbench} />;
}

type WorkbenchContentProps = {
    workbench: Workbench;
    isInitialized: boolean;
};

function WorkbenchContent(props: WorkbenchContentProps) {
    const { workbench, isInitialized } = props;

    const isSessionLoading = useGuiValue(workbench.getGuiMessageBroker(), GuiState.IsLoadingSession);
    const isSnapshotLoading = useGuiValue(workbench.getGuiMessageBroker(), GuiState.IsLoadingSnapshot);
    const isEnsembleSetLoading = useGuiValue(workbench.getGuiMessageBroker(), GuiState.IsLoadingEnsembleSet);
    const hasActiveSession = usePublishSubscribeTopicValue(
        workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION,
    );

    let content: React.ReactNode;
    const loadingOverlayNote = `Note that the first time an ensemble is loaded in Webviz,
                it might take a while to collect all parameter values...`;
    if (isEnsembleSetLoading) {
        content = <LoadingOverlay text="Loading ensemble set..." note={loadingOverlayNote} />;
    } else if (!isInitialized) {
        content = <LoadingOverlay text="Initializing application..." note={loadingOverlayNote} />;
    } else if (isSessionLoading) {
        content = <LoadingOverlay text="Loading session..." note={loadingOverlayNote} />;
    } else if (isSnapshotLoading) {
        content = <LoadingOverlay text="Loading snapshot..." note={loadingOverlayNote} />;
    } else if (!hasActiveSession) {
        content = <StartPage workbench={workbench} />;
    }

    return (
        <>
            <TopBar workbench={workbench} />
            <ActiveSessionBoundary workbench={workbench}>
                <ActiveDashboardBoundary>
                    <DocumentTitleSync workbench={workbench} />
                    <ActionBar workbench={workbench} />
                    <SelectEnsemblesDialog workbench={workbench} />
                    <InitialEnsemblesLoadingErrorInfoDialog workbench={workbench} />
                    <InitialEnsemblesLoadingWarningInfoDialog workbench={workbench} />
                    <SaveSessionDialog workbench={workbench} saveAsNew />
                    <CreateSnapshotDialog workbench={workbench} />
                    <ActiveSessionRecoveryDialog workbench={workbench} />
                    <div className="min-h-0 grow">
                        <div className="flex h-full w-full flex-row">
                            <SettingsContentPanels workbench={workbench} />
                            <RightSideBar workbench={workbench} />
                        </div>
                    </div>
                    <BottomBar workbench={workbench} />
                </ActiveDashboardBoundary>
            </ActiveSessionBoundary>
            {content}
            <TemplatesDialog workbench={workbench} />
            <TutorialsDialog workbench={workbench} />
            <MultiSessionsRecoveryDialog workbench={workbench} />
            <PersistenceManagementDialog workbench={workbench} />
            <SessionErrorDialog workbench={workbench} />
        </>
    );
}
