import { GridView } from "@mui/icons-material";

import { GuiState, useGuiValue, useSetGuiState } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Separator } from "@lib/components/Separator";
import { Tooltip } from "@lib/components/Tooltip";
import { WindowListIcon } from "@lib/icons";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../../ActiveSessionBoundary";

export type StartPanelProps = {
    workbench: Workbench;
};

export function StartPanel(props: StartPanelProps) {
    const workbenchSession = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    const setTemplatesDialogOpen = useSetGuiState(props.workbench.getGuiMessageBroker(), GuiState.TemplatesDialogOpen);

    function handleTemplatesListClick() {
        setTemplatesDialogOpen(true);
    }

    return (
        <>
            <EnsembleSettingsButton workbench={props.workbench} />
            <Separator orientation="vertical" />
            <Button disabled={isSnapshot} iconOnly onClick={handleTemplatesListClick} tone="accent" variant="ghost">
                <GridView fontSize="inherit" />
            </Button>
        </>
    );
}

type EnsembleSettingsButtonProps = {
    workbench: Workbench;
};

function EnsembleSettingsButton(props: EnsembleSettingsButtonProps): React.ReactNode {
    const workbenchSession = props.workbench.getSessionManager().getActiveSession();
    const ensembleSet = usePublishSubscribeTopicValue(workbenchSession, WorkbenchSessionTopic.ENSEMBLE_SET);
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    const isEnsembleSetLoading = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.IsLoadingEnsembleSet);
    const setEnsembleDialogOpen = useSetGuiState(props.workbench.getGuiMessageBroker(), GuiState.EnsembleDialogOpen);

    function handleEnsembleDialogOpenClick() {
        setEnsembleDialogOpen(true);
    }

    return (
        <Tooltip
            content={isSnapshot ? "Ensembles cannot be changed in snapshot mode" : "Open ensemble selection dialog"}
            side="bottom"
        >
            <Button
                disabled={isSnapshot}
                iconOnly
                onClick={handleEnsembleDialogOpenClick}
                tone="accent"
                variant="ghost"
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
                    <List />
                </Badge>
            </Button>
        </Tooltip>
    );
}
