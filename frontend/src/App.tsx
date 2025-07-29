import React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { ActiveSessionBoundary } from "@framework/internal/components/ActiveSessionBoundary";
import { AuthenticationBoundary } from "@framework/internal/components/AuthenticationBoundary";
import { CreateSnapshotDialog } from "@framework/internal/components/CreateSnapshotDialog/createSnapshotDialog";
import { GlobalConfirmationDialog } from "@framework/internal/components/GlobalConfirmationDialog/globalConfirmationDialog";
import { LoadingOverlay } from "@framework/internal/components/LoadingOverlay";
import { LeftNavBar, RightNavBar } from "@framework/internal/components/NavBar";
import { RecoveryDialog } from "@framework/internal/components/RecoveryDialog/recoveryDialog";
import { SaveSessionDialog } from "@framework/internal/components/SaveSessionDialog/saveSessionDialog";
import { SelectEnsemblesDialog } from "@framework/internal/components/SelectEnsemblesDialog";
import { SettingsContentPanels } from "@framework/internal/components/SettingsContentPanels";
import { StartPage } from "@framework/internal/components/StartPage/StartPage";
import { ToggleDevToolsButton } from "@framework/internal/components/ToggleDevToolsButton";
import { TopBar } from "@framework/internal/components/TopBar/topBar";
import { Workbench, WorkbenchTopic } from "@framework/Workbench";
import "./modules/registerAllModules";
import "./templates/registerAllTemplates";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { TemplatesDialog } from "@framework/internal/components/TemplatesDialog/templatesDialog";

function App() {
    // Workbench must be kept as a state in order to keep it when any framework code is changed in dev mode.
    // Otherwise, the workbench will be reset on every code change. This would cause it to loose its state and will
    // cause the app to crash.
    const queryClient = useQueryClient();
    const [workbench] = React.useState(new Workbench(queryClient));
    const [isInitialized, setIsInitialized] = React.useState<boolean>(false);
    const isSessionLoading = useGuiValue(workbench.getGuiMessageBroker(), GuiState.IsLoadingSession);
    const hasActiveSession = usePublishSubscribeTopicValue(workbench, WorkbenchTopic.HAS_ACTIVE_SESSION);

    React.useEffect(
        function initApp() {
            workbench.initialize().then(() => {
                setIsInitialized(true);
            });
        },
        [workbench],
    );

    let content: React.ReactNode;
    if (!isInitialized) {
        content = <LoadingOverlay text="Initializing application..." />;
    } else if (isSessionLoading) {
        content = <LoadingOverlay text="Loading session..." />;
    } else if (hasActiveSession) {
        content = (
            <>
                <div className="grow min-h-0">
                    <div className="w-full h-full flex flex-row">
                        <LeftNavBar workbench={workbench} />
                        <SettingsContentPanels workbench={workbench} />
                        <RightNavBar workbench={workbench} />
                    </div>
                </div>
            </>
        );
    } else {
        content = <StartPage workbench={workbench} />;
    }

    return (
        <div className="bg-gray-100">
            <GlobalConfirmationDialog />
            <AuthenticationBoundary>
                <>
                    <TopBar workbench={workbench} />
                    <ActiveSessionBoundary workbench={workbench}>
                        <SelectEnsemblesDialog workbench={workbench} />
                        <SaveSessionDialog workbench={workbench} />
                        <CreateSnapshotDialog workbench={workbench} />
                    </ActiveSessionBoundary>
                    <RecoveryDialog workbench={workbench} />
                    <TemplatesDialog workbench={workbench} />
                    {content}
                </>
            </AuthenticationBoundary>
            <ToggleDevToolsButton guiMessageBroker={workbench.getGuiMessageBroker()} />
        </div>
    );
}

export default App;
