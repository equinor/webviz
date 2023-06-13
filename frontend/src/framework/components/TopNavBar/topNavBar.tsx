import React from "react";

import { useSetStoreValue } from "@framework/StateStore";
import { useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { ShareIcon, WindowIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { IconButton } from "@lib/components/IconButton";

// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";
import { EnsembleSelector } from "../EnsembleSelector";
import { LoginButton } from "../LoginButton";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const setModulesListOpen = useSetStoreValue(props.workbench.getGuiStateStore(), "modulesListOpen");
    const setSyncSettingsActive = useSetStoreValue(props.workbench.getGuiStateStore(), "syncSettingsActive");
    // const selectedEnsembles = useStoreValue(props.workbench.getDataStateStore(), "selectedEnsembles");

    const handleEnsembleClick = () => {
        setEnsembleDialogOpen(true);
    };

    const handleModulesListClick = () => {
        setModulesListOpen(true);
    };

    const handleSyncSettingsClick = () => {
        setSyncSettingsActive(true);
    };

    let ensembleButtonText = "Select ensembles";
    // if (selectedEnsembles.length > 0) {
    //     ensembleButtonText = `${selectedEnsembles[0].caseName} - ${selectedEnsembles[0].ensembleName}`;
    //     if (selectedEnsembles.length > 1) {
    //         ensembleButtonText += ` and ${selectedEnsembles.length - 1} more`;
    //     }
    // }

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
                    <ShareIcon className="w-5 h-5" /> Sync settings
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
