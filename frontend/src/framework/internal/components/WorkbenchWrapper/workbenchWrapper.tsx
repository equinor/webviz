import React from "react";

import { useQueryClient } from "@tanstack/react-query";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { ActiveSessionBoundary } from "@framework/internal/components/ActiveSessionBoundary";
import { LoadingOverlay } from "@framework/internal/components/LoadingOverlay";
import { SelectEnsemblesDialog } from "@framework/internal/components/SelectEnsemblesDialog";
import { SettingsContentPanels } from "@framework/internal/components/SettingsContentPanels";
import { ToggleDevToolsButton } from "@framework/internal/components/ToggleDevToolsButton";
import { TopBar } from "@framework/internal/components/TopBar/topBar";
import { Workbench, WorkbenchTopic } from "@framework/Workbench";
import "../../../../modules/registerAllModules";
import "../../../../templates/registerAllTemplates";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { LeftNavBar } from "../LeftNavBar";
import { RightNavBar } from "../RightNavBar";

export function WorkbenchWrapper() {
    // Workbench must be kept as a state in order to keep it when any framework code is changed in dev mode.
    // Otherwise, the workbench will be reset on every code change. This would cause it to lose its state and will
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
    }

    return (
        <>
            <TopBar workbench={workbench} />
            <ActiveSessionBoundary workbench={workbench}>
                <SelectEnsemblesDialog workbench={workbench} />
            </ActiveSessionBoundary>
            {content}
            <ToggleDevToolsButton guiMessageBroker={workbench.getGuiMessageBroker()} />
        </>
    );
}
