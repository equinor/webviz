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

export function WorkbenchWrapper() {
    // Workbench must be kept as a state in order to keep it when any framework code is changed in dev mode.
    // Otherwise, the workbench will be reset on every code change. This would cause it to lose its state and will
    // cause the app to crash.
    const queryClient = useQueryClient();
    const { registerActiveWorkbench } = useGlobalErrorBoundaryContext();

    const [workbench] = React.useState(new Workbench(queryClient));
    const [isInitialized, setIsInitialized] = React.useState<boolean>(false);
    const isSessionLoading = useGuiValue(workbench.getGuiMessageBroker(), GuiState.IsLoadingSession);
    const isSnapshotLoading = useGuiValue(workbench.getGuiMessageBroker(), GuiState.IsLoadingSnapshot);
    const isEnsembleSetLoading = useGuiValue(workbench.getGuiMessageBroker(), GuiState.IsLoadingEnsembleSet);
    const hasActiveSession = usePublishSubscribeTopicValue(
        workbench.getSessionManager(),
        WorkbenchSessionManagerTopic.HAS_ACTIVE_SESSION,
    );

    React.useEffect(
        function initApp() {
            registerActiveWorkbench(workbench);

            workbench.initialize().then(() => {
                setIsInitialized(true);
            });

            return () => {
                registerActiveWorkbench(null);
            };
        },
        [registerActiveWorkbench, workbench],
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
                </ActiveDashboardBoundary>
            </ActiveSessionBoundary>
            {content}
            <TemplatesDialog workbench={workbench} />
            <MultiSessionsRecoveryDialog workbench={workbench} />
            <PersistenceManagementDialog workbench={workbench} />
            <SessionErrorDialog workbench={workbench} />
        </>
    );
}
