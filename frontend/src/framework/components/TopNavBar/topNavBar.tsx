import React from "react";

import { useSetStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { ShareIcon, WindowIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";

import { LoginButton } from "../LoginButton";
// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";
import { EnsembleSelector } from "../SelectEnsemblesDialog";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const setModulesListOpen = useSetStoreValue(props.workbench.getGuiStateStore(), "modulesListOpen");
    const setSyncSettingsActive = useSetStoreValue(props.workbench.getGuiStateStore(), "syncSettingsActive");
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());

    const handleEnsembleClick = () => {
        setEnsembleDialogOpen(true);
    };

    const handleEnsembleSelectorClose = () => {
        setEnsembleDialogOpen(false);
    };

    const handleModulesListClick = () => {
        setModulesListOpen(true);
    };

    const handleSyncSettingsClick = () => {
        setSyncSettingsActive(true);
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
                    <ShareIcon className="w-5 h-5" /> Sync settings
                </Button>
                <LoginButton />
            </div>
            <EnsembleSelector
                open={ensembleDialogOpen}
                onClose={handleEnsembleSelectorClose}
                workbench={props.workbench}
            />
        </div>
    );
};
