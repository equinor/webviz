import type React from "react";

import { GridView, List } from "@mui/icons-material";

import { GuiState, useGuiValue, useSetGuiState } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { Badge } from "@lib/components/Badge";
import { CircularProgress } from "@lib/components/CircularProgress";
import { NavBarButton, NavBarDivider } from "@lib/components/NavBarComponents";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

type LeftNavBarProps = {
    workbench: Workbench;
};

export const LeftNavBar: React.FC<LeftNavBarProps> = (props) => {
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
        <div
            className={resolveClassNames(
                "bg-white p-2 pt-4 border-r-2 border-slate-200 z-50 shadow-lg flex flex-col w-16",
            )}
        >
            <div className="flex flex-col gap-2 grow">
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
                <NavBarDivider />
                <NavBarButton
                    tooltip="Show templates dialog"
                    icon={<GridView fontSize="small" className="size-5" />}
                    onClick={handleTemplatesListClick}
                    disabled={isSnapshot}
                    disabledTooltip="Templates cannot be applied in snapshot mode"
                />
                <div className="grow h-5" />
            </div>
        </div>
    );
};
