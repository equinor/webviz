import { Settings, Tune } from "@mui/icons-material";

import { useDashboardSettingInstances } from "@framework/DashboardSettings/adapters/react";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/components/Badge";
import { Toggle } from "@lib/components/Toggle";
import { Tooltip } from "@lib/components/Tooltip";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";

export type DashboardSettingsToggleProps = {
    workbench: Workbench;
};

export function DashboardSettingsToggle(props: DashboardSettingsToggleProps): React.ReactNode {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const [isPanelVisible, setIsPanelVisible] = useGuiState(guiMessageBroker, GuiState.DashboardSettingsPanelVisible);
    const [isLeftSettingsPanelCollapsed, setIsLeftSettingsPanelCollapsed] = useGuiState(
        guiMessageBroker,
        GuiState.LeftSettingsPanelIsCollapsed,
    );

    const dashboard = useActiveDashboard();
    const activeDashboardSettings = useDashboardSettingInstances(dashboard.getDashboardSettingsService());

    // The panel lives in the left settings panel, so it's only actually shown while that is expanded.
    const isPanelShown = isPanelVisible && !isLeftSettingsPanelCollapsed;

    function handleClick() {
        if (isPanelShown) {
            setIsPanelVisible(false);
            return;
        }

        setIsPanelVisible(true);
        setIsLeftSettingsPanelCollapsed(false);
    }

    const label = isPanelShown ? "Hide dashboard settings" : "Show dashboard settings";

    return (
        <Tooltip content={label} side="bottom">
            <span>
                <Toggle.Button
                    aria-label={label}
                    aria-pressed={isPanelShown}
                    buttonProps={{ iconOnly: true }}
                    onPressedChange={handleClick}
                    pressed={isPanelShown}
                >
                    <Badge
                        invisible={activeDashboardSettings.length === 0}
                        tone="accent"
                        badgeContent={activeDashboardSettings.length}
                    >
                        <Tune fontSize="inherit" />
                    </Badge>
                </Toggle.Button>
            </span>
        </Tooltip>
    );
}
