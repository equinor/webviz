import type React from "react";

import { GridView, List } from "@mui/icons-material";

import { GuiState, useGuiValue, useSetGuiState } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { Badge } from "@lib/components/Badge";
import { CircularProgress } from "@lib/components/CircularProgress";
import { NavBarButton } from "@lib/components/NavBarComponents";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { SideBar } from "../SideBar/sideBar";
import { Separator } from "@lib/newComponents/Separator";

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
        <SideBar position="left">
            <div className="flex grow flex-col gap-2">
                <NavBarButton
                    tooltip={"Open ensemble selection dialog"}
                    disabledTooltip={"Ensembles cannot be changed in snapshot mode"}
                    disabled={isSnapshot}
                    icon={
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
                    }
                    onClick={handleEnsembleDialogOpenClick}
                />
                <Separator orientation="horizontal" />
                <NavBarButton
                    tooltip="Show templates dialog"
                    icon={<GridView fontSize="small" className="size-5" />}
                    onClick={handleTemplatesListClick}
                    disabled={isSnapshot}
                    disabledTooltip="Templates cannot be applied in snapshot mode"
                />
                <div className="h-5 grow" />
            </div>
        </SideBar>
    );
};
