import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { GuiActions, useGuiState } from "@framework/GuiState";
import { Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { ShareIcon, WindowIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { useQueryClient } from "@tanstack/react-query";

import { LoginButton } from "../LoginButton";
// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";
import { SelectEnsemblesDialog } from "../SelectEnsemblesDialog";
import { EnsembleItem } from "../SelectEnsemblesDialog/selectEnsemblesDialog";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());

    const queryClient = useQueryClient();
    const guiState = useGuiState();

    const handleEnsembleClick = () => {
        setEnsembleDialogOpen(true);
    };

    const handleModulesListClick = () => {
        guiState.dispatch({ type: GuiActions.OPEN_MODULES_DRAWER });
    };

    const handleSyncSettingsClick = () => {
        guiState.dispatch({ type: GuiActions.OPEN_SYNC_SETTINGS_DRAWER });
    };

    const handleEnsembleDialogClose = (selectedEnsembles: EnsembleItem[] | null) => {
        setEnsembleDialogOpen(false);
        if (selectedEnsembles !== null) {
            const selectedEnsembleIdents = selectedEnsembles.map(
                (ens) => new EnsembleIdent(ens.caseUuid, ens.ensembleName)
            );
            props.workbench.loadAndSetupEnsembleSetInSession(queryClient, selectedEnsembleIdents);
        }
    };

    let ensembleButtonText = "Select ensembles";
    if (ensembleSet.hasAnyEnsembles()) {
        const ensArr = ensembleSet.getEnsembleArr();
        ensembleButtonText = ensArr[0].getDisplayName();
        if (ensArr.length > 1) {
            ensembleButtonText += ` and ${ensArr.length - 1} more`;
        }
    }

    const selectedEnsembles = ensembleSet.getEnsembleArr().map((ens) => ({
        caseUuid: ens.getCaseUuid(),
        caseName: ens.getCaseName(),
        ensembleName: ens.getEnsembleName(),
    }));

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
            {ensembleDialogOpen && (
                <SelectEnsemblesDialog selectedEnsembles={selectedEnsembles} onClose={handleEnsembleDialogClose} />
            )}
        </div>
    );
};
