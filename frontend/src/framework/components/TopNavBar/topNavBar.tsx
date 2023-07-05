import React from "react";

import { openModulesDrawer, openSyncSettingsDrawer, useGuiDispatch } from "@framework/GuiState";
import { Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { LinkIcon, WindowIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";

// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";
import { EnsembleSelector } from "../EnsembleSelector";
import { LoginButton } from "../LoginButton";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());

    const dispatch = useGuiDispatch();

    const handleEnsembleClick = () => {
        setEnsembleDialogOpen(true);
    };

    const handleModulesListClick = () => {
        dispatch(openModulesDrawer());
    };

    const handleSyncSettingsClick = () => {
        dispatch(openSyncSettingsDrawer());
    };

    let ensembleButtonText = "Select ensembles";
    if (ensembleSet.hasAnyEnsembles()) {
        const ensArr = ensembleSet.getEnsembleArr();
        ensembleButtonText = ensArr[0].getDisplayName();
        if (ensArr.length > 1) {
            ensembleButtonText += ` and ${ensArr.length - 1} more`;
        }
    }

    return (
        <div className="bg-slate-100 p-4 shadow z-50">
            <div className="flex flex-row gap-4 items-center">
                <h1 className="flex-grow">{activeModuleName}</h1>
                <Button onClick={handleEnsembleClick} variant="contained">
                    {ensembleButtonText}
                </Button>
                <Button onClick={handleModulesListClick} startIcon={<WindowIcon className="w-5 h-5" />}>
                    Modules
                </Button>
                <Button onClick={handleSyncSettingsClick}>
                    <LinkIcon className="w-5 h-5" /> Sync settings
                </Button>
                <LoginButton />
            </div>
            <Dialog
                open={ensembleDialogOpen}
                onClose={() => setEnsembleDialogOpen(false)}
                title="Select ensembles"
                modal
                width={"75%"}
                actions={
                    <div className="flex gap-4">
                        <Button onClick={() => setEnsembleDialogOpen(false)}>OK</Button>
                    </div>
                }
            >
                <EnsembleSelector workbench={props.workbench} />
            </Dialog>
        </div>
    );
};
