import { GridView, List } from "@mui/icons-material";

import { GuiState, useGuiValue, useSetGuiState } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { Tooltip } from "@lib/components/Tooltip";
import { Badge } from "@lib/newComponents/Badge";
import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";
import { Separator } from "@lib/newComponents/Separator";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

export type StartPanelProps = {
    workbench: Workbench;
};

export function StartPanel(props: StartPanelProps) {
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
        <>
            <Tooltip
                title={isSnapshot ? "Ensembles cannot be changed in snapshot mode" : "Open ensemble selection dialog"}
                placement="bottom"
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
                            tone="accent"
                            badgeContent={
                                isEnsembleSetLoading ? (
                                    <CircularProgress size={16} tone="on-emphasis" />
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
            <Separator orientation="vertical" />
            <Tooltip
                title={isSnapshot ? "Templates cannot be applied in snapshot mode" : "Show templates dialog"}
                placement="bottom"
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
        </>
    );
}
