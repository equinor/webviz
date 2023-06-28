import React from "react";

import { useSetStoreValue, useStoreState } from "@framework/StateStore";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { ShareIcon, Squares2X2Icon, WindowIcon } from "@heroicons/react/20/solid";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";

// import { useWorkbenchActiveModuleName } from "@framework/hooks/useWorkbenchActiveModuleName";
import { EnsembleSelector } from "../EnsembleSelector";
import { LoginButton } from "../LoginButton";

type TopNavBarProps = {
    workbench: Workbench;
};

export const TopNavBar: React.FC<TopNavBarProps> = (props) => {
    const activeModuleName = ""; // useWorkbenchActiveModuleName();
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const [drawerContent, setDrawerContent] = useStoreState(props.workbench.getGuiStateStore(), "drawerContent");
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());

    const handleEnsembleClick = () => {
        setEnsembleDialogOpen(true);
    };

    const handleModulesListClick = () => {
        setDrawerContent(DrawerContent.ModulesList);
    };

    const handleTemplatesListClick = () => {
        setDrawerContent(DrawerContent.TemplatesList);
    };

    const handleSyncSettingsClick = () => {
        setDrawerContent(DrawerContent.SyncSettings);
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
