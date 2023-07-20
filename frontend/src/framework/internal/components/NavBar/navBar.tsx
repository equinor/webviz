import React from "react";

import WebvizLogo from "@assets/webviz.svg";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { useStoreState } from "@framework/StateStore";
import { DrawerContent, Workbench } from "@framework/Workbench";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { LoginButton } from "@framework/internal/components/LoginButton";
import { SelectEnsemblesDialog } from "@framework/internal/components/SelectEnsemblesDialog";
import { EnsembleItem } from "@framework/internal/components/SelectEnsemblesDialog/selectEnsemblesDialog";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    LinkIcon,
    QueueListIcon,
    ShareIcon,
    Squares2X2Icon,
    WindowIcon,
} from "@heroicons/react/20/solid";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";
import { useQueryClient } from "@tanstack/react-query";

type NavBarProps = {
    workbench: Workbench;
};

const NavBarDivider: React.FC = () => {
    return <div className="bg-slate-200 h-[1px] w-full mt-4 mb-4" />;
};

export const NavBar: React.FC<NavBarProps> = (props) => {
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const [expanded, setExpanded] = React.useState<boolean>(false);
    const [loadingEnsembles, setLoadingEnsembles] = React.useState<boolean>(false);
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
            setLoadingEnsembles(true);
            props.workbench.loadAndSetupEnsembleSetInSession(queryClient, selectedEnsembleIdents).then(() => {
                setLoadingEnsembles(false);
            });
        }
    };

    function handleCollapseOrExpand() {
        setExpanded(!expanded);
    }

    const selectedEnsembles = ensembleSet.getEnsembleArr().map((ens) => ({
        caseUuid: ens.getCaseUuid(),
        caseName: ens.getCaseName(),
        ensembleName: ens.getEnsembleName(),
    }));

    return (
        <div
            className={resolveClassNames(
                "bg-white p-2 border-r-2 border-slate-200 z-50 shadow-lg flex flex-col",
                expanded ? "w-60" : "w-[4.5rem]"
            )}
        >
            <div className="flex flex-col gap-2 flex-grow">
                <div className="w-full flex justify-center mb-2 mt-1 p-2">
                    <img src={WebvizLogo} alt="Webviz logo" className="w-20 h-20" />
                </div>
                <div className="flex justify-end">
                    <Button
                        onClick={handleCollapseOrExpand}
                        className="!text-slate-800"
                        title={expanded ? "Collapse menu" : "Expand menu"}
                    >
                        {expanded ? <ChevronLeftIcon className="w-5 h-5" /> : <ChevronRightIcon className="w-5 h-5" />}
                    </Button>
                </div>
                <NavBarDivider />
                <Button
                    title="Open ensemble selection dialog"
                    onClick={handleEnsembleClick}
                    className="w-full !text-slate-800 h-10"
                    startIcon={
                        selectedEnsembles.length === 0 && !loadingEnsembles ? (
                            <QueueListIcon className="w-5 h-5" />
                        ) : (
                            <Badge
                                className="mr-2"
                                color="bg-blue-500"
                                badgeContent={
                                    loadingEnsembles ? (
                                        <CircularProgress size="extra-small" color="inherit" />
                                    ) : (
                                        selectedEnsembles.length
                                    )
                                }
                            >
                                <QueueListIcon className="w-5 h-5" />
                            </Badge>
                        )
                    }
                >
                    {expanded ? "Ensembles" : ""}
                </Button>
                <NavBarDivider />
                <Button
                    title="Open modules list"
                    onClick={handleModulesListClick}
                    startIcon={<WindowIcon className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.ModulesList ? "text-red-600" : "!text-slate-800"
                    )}
                >
                    {expanded ? "Modules" : ""}
                </Button>
                <Button
                    title="Open templates list"
                    onClick={handleTemplatesListClick}
                    startIcon={<Squares2X2Icon className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.TemplatesList ? "text-red-600" : "!text-slate-800"
                    )}
                >
                    {expanded ? "Templates" : ""}
                </Button>
                <Button
                    title="Open sync settings"
                    onClick={handleSyncSettingsClick}
                    startIcon={<LinkIcon className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.SyncSettings ? "text-red-600" : "!text-slate-800"
                    )}
                >
                    {expanded ? "Sync settings" : ""}
                </Button>
                <NavBarDivider />
                <LoginButton className="w-full !text-slate-800 h-10" showText={expanded} />
                <div className="flex-grow h-5" />
                <NavBarDivider />
                <Button
                    title="Visit project on GitHub"
                    onClick={() => window.open("https://github.com/equinor/webviz", "_blank")}
                    className="w-full !text-slate-300 hover:!text-slate-800 h-10"
                    startIcon={<ShareIcon className="w-5 h-5" />}
                >
                    {expanded ? "Webviz on GitHub" : ""}
                </Button>
            </div>
            {ensembleDialogOpen && (
                <SelectEnsemblesDialog selectedEnsembles={selectedEnsembles} onClose={handleEnsembleDialogClose} />
            )}
        </div>
    );
};
