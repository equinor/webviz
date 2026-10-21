import React from "react";

import { Block } from "@mui/icons-material";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { useDashboard } from "@framework/internal/components/DashboardContext";
import { DashboardTopic } from "@framework/internal/Dashboard";
import { useStatusControllerStateValue } from "@framework/internal/ModuleInstanceStatusControllerInternal";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { StatusMessageType } from "@framework/ModuleInstanceStatusController";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Typography } from "@lib/components/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

type ActionRequiredOverlayBarProps = {
    workbench: Workbench;
    moduleInstance: ModuleInstance<any, any>;
};

export function ActionRequiredOverlayBar(props: ActionRequiredOverlayBarProps): React.ReactNode {
    const { dashboard } = useDashboard();
    const [isLeftSettingsPanelCollapsed, setLeftSettingsPanelIsCollapsed] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelIsCollapsed,
    );

    const hotStatusMessages = useStatusControllerStateValue(
        props.moduleInstance.getStatusController(),
        "hotMessageCache",
    );
    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);

    const messages = hotStatusMessages.filter((entry) => entry.type === StatusMessageType.ActionRequired);
    const isActiveModuleWithSettingsOpen =
        props.moduleInstance.getId() === activeModuleInstanceId && !isLeftSettingsPanelCollapsed;

    if (messages.length === 0 || isActiveModuleWithSettingsOpen) {
        return null;
    }

    function handleGoToSettings() {
        dashboard.setActiveModuleInstanceId(props.moduleInstance.getId());
        setLeftSettingsPanelIsCollapsed(false);
    }

    return (
        <div className="px-xs gap-4xs bg-danger-surface border-danger-strong shadow-elevation-raised py-4xs text-body-lg flex items-center justify-between border-t border-b select-none">
            <div className="gap-x-2xs flex items-center">
                <Block fontSize="inherit" color="error" />
                <Typography as="span" size="sm" weight="bolder">
                    {`Action required`}
                </Typography>
            </div>
            <Button size="small" variant="outlined" tone="danger" onClick={handleGoToSettings}>
                Go to settings
            </Button>
        </div>
    );
}
