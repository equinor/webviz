import type React from "react";

import { GridView, List } from "@mui/icons-material";

import { GuiState, useGuiValue, useSetGuiState } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { Badge } from "@lib/components/Badge";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Tooltip } from "@lib/components/Tooltip";
import { Button } from "@lib/newComponents/Button";
import { Separator } from "@lib/newComponents/Separator";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { SideBar } from "../SideBar/sideBar";

type LeftSideBarProps = {
    workbench: Workbench;
};

export const LeftSideBar: React.FC<LeftSideBarProps> = (props) => {
    const workbenchSession = props.workbench.getSessionManager().getActiveSession();
    const ensembleSet = usePublishSubscribeTopicValue(workbenchSession, WorkbenchSessionTopic.ENSEMBLE_SET);
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    const isEnsembleSetLoading = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsLoadingEnsembleSet);
    const setEnsembleDialogOpen = useSetGuiState(props.workbench.getGuiMessageBroker(), GuiState.EnsembleDialogOpen);
    const setTemplatesDialogOpen = useSetGuiState(props.workbench.getGuiMessageBroker(), GuiState.TemplatesDialogOpen);

    function handleEnsembleDialogOpenClick() {
        setEnsembleDialogOpen(true);
    }

    function handleTemplatesListClick() {
        setTemplatesDialogOpen(true);
    }

    return (
        <SideBar position="left" className="p-space-xs">
            <div className="gap-space-xs flex grow flex-col">
                <Tooltip
                    title={
                        isSnapshot ? "Ensembles cannot be changed in snapshot mode" : "Open ensemble selection dialog"
                    }
                    placement="right"
                >
                    {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
                    <span>
                        <Button
                            disabled={isSnapshot}
                            iconOnly
                            onClick={handleEnsembleDialogOpenClick}
                            tone="accent"
                            variant="text"
                        >
                            <Badge
                                invisible={ensembleSet.getEnsembleArray().length === 0 && !isEnsembleSetLoading}
                                color="bg-blue-500"
                                badgeContent={
                                    isEnsembleSetLoading ? (
                                        <CircularProgress size="extra-small" color="inherit" />
                                    ) : (
                                        ensembleSet.getEnsembleArray().length
                                    )
                                }
                            >
                                <List fontSize="small" className="size-5" />
                            </Badge>
                        </Button>
                    </span>
                </Tooltip>
                <Separator orientation="horizontal" />
                <Tooltip
                    title={isSnapshot ? "Templates cannot be applied in snapshot mode" : "Show templates dialog"}
                    placement="right"
                >
                    {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
                    <span>
                        <Button
                            disabled={isSnapshot}
                            iconOnly
                            onClick={handleTemplatesListClick}
                            tone="accent"
                            variant="text"
                        >
                            <GridView fontSize="small" className="size-5" />
                        </Button>
                    </span>
                </Tooltip>
                <div className="h-5 grow" />
            </div>
        </SideBar>
    );
};
