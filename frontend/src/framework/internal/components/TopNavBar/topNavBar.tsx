import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { useStoreState } from "@framework/StateStore";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { LoginButton } from "@framework/internal/components/LoginButton";
import { SelectEnsemblesDialog } from "@framework/internal/components/SelectEnsemblesDialog";
import { EnsembleItem } from "@framework/internal/components/SelectEnsemblesDialog/selectEnsemblesDialog";
import { ShareIcon, Squares2X2Icon, WindowIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import { useQueryClient } from "@tanstack/react-query";

// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const [drawerContent, setDrawerContent] = useStoreState(props.workbench.getGuiStateStore(), "drawerContent");
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());

    const queryClient = useQueryClient();

    const handleEnsembleClick = () => {
        setEnsembleDialogOpen(true);
    };

    const handleModulesListClick = () => {
        if (drawerContent === DrawerContent.ModulesList) {
            setDrawerContent(DrawerContent.None);
            return;
        }
        setDrawerContent(DrawerContent.ModulesList);
    };

    const handleTemplatesListClick = () => {
        if (drawerContent === DrawerContent.TemplatesList) {
            setDrawerContent(DrawerContent.None);
            return;
        }
        setDrawerContent(DrawerContent.TemplatesList);
    };

    const handleSyncSettingsClick = () => {
        if (drawerContent === DrawerContent.SyncSettings) {
            setDrawerContent(DrawerContent.None);
            return;
        }
        setDrawerContent(DrawerContent.SyncSettings);
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
        <div className="bg-slate-100 p-2 shadow z-50">
            <div className="flex flex-row gap-4 items-center">
                <h1 className="flex-grow">{activeModuleName}</h1>
                <Button onClick={handleEnsembleClick} variant="contained">
                    {ensembleButtonText}
                </Button>
                <Button
                    onClick={handleModulesListClick}
                    startIcon={<WindowIcon className="w-5 h-5" />}
                    className={resolveClassNames({ "text-red-600": drawerContent === DrawerContent.ModulesList })}
                >
                    Modules
                </Button>
                <Button
                    onClick={handleTemplatesListClick}
                    startIcon={<Squares2X2Icon className="w-5 h-5" />}
                    className={resolveClassNames({ "text-red-600": drawerContent === DrawerContent.TemplatesList })}
                >
                    Templates
                </Button>
                <Button
                    onClick={handleSyncSettingsClick}
                    startIcon={<ShareIcon className="w-5 h-5" />}
                    className={resolveClassNames({ "text-red-600": drawerContent === DrawerContent.SyncSettings })}
                >
                    Sync settings
                </Button>
                <LoginButton />
            </div>
            {ensembleDialogOpen && (
                <SelectEnsemblesDialog selectedEnsembles={selectedEnsembles} onClose={handleEnsembleDialogClose} />
            )}
        </div>
    );
};
