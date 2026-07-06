import { Add, GridView, List } from "@mui/icons-material";

import { GuiState, useGuiValue, useSetGuiState } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Separator } from "@lib/components/Separator";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { Tabs } from "@lib/components/Tabs";
import React from "react";
import { useActiveSession } from "../../ActiveSessionBoundary";

export type StartPanelProps = {
    workbench: Workbench;
};

export function StartPanel(props: StartPanelProps) {
    const workbenchSession = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);
    const dashboards = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.DASHBOARDS);

    const setTemplatesDialogOpen = useSetGuiState(props.workbench.getGuiMessageBroker(), GuiState.TemplatesDialogOpen);

    function handleTemplatesListClick() {
        setTemplatesDialogOpen(true);
    }

    const handleActiveDashboardChange = React.useCallback(
        function handleActiveDashboardChange(dashboardId: string) {
            workbenchSession.setActiveDashboard(dashboardId);
        },
        [workbenchSession],
    );

    const handleAddDashboardClick = React.useCallback(
        function handleAddDashboardClick() {
            workbenchSession.addDashboard();
        },
        [workbenchSession],
    );

    const handleRemoveDashboardClick = React.useCallback(
        function handleRemoveDashboardClick(dashboardId: string) {
            workbenchSession.removeDashboard(dashboardId);
        },
        [workbenchSession],
    );

    return (
        <>
            <Tabs.Root onValueChange={handleActiveDashboardChange}>
                <Tabs.List size="small">
                    {dashboards.map((dashboard) => (
                        <DashboardTab
                            key={dashboard.getId()}
                            id={dashboard.getId()}
                            name={dashboard.getName()}
                            onActivate={() => {
                                workbenchSession.setActiveDashboard(dashboard.getId());
                            }}
                            onDelete={() => {
                                handleRemoveDashboardClick(dashboard.getId());
                            }}
                        />
                    ))}
                </Tabs.List>
            </Tabs.Root>
            <Tooltip
                content={isSnapshot ? "Dashboards cannot be modified in snapshot mode" : "Add new dashboard"}
                side="bottom"
            >
                <Button disabled={isSnapshot} iconOnly onClick={handleAddDashboardClick} tone="accent" variant="ghost">
                    <Add />
                </Button>
            </Tooltip>
            <Separator orientation="vertical" />
            <Tooltip
                content={isSnapshot ? "Templates cannot be applied in snapshot mode" : "Show templates dialog"}
                side="bottom"
            >
                <Button disabled={isSnapshot} iconOnly onClick={handleTemplatesListClick} tone="accent" variant="ghost">
                    <GridView fontSize="inherit" />
                </Button>
            </Tooltip>
        </>
    );
}

type DashboardTabProps = {
    id: string;
    name: string;
    onActivate: () => void;
    onDelete: () => void;
};

function DashboardTab({ id, name, onActivate, onDelete }: DashboardTabProps) {
    return (
        <Tooltip content={id} side="bottom">
            <Tabs.Tab value={id} layoutClassName="flex items-center gap-x-xs">
                <span className="truncate">{name}</span>
                <Button onClick={onDelete} iconOnly tone="danger" variant="ghost" size="small">
                    x
                </Button>
            </Tabs.Tab>
        </Tooltip>
    );
}
