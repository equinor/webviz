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
    Cog6ToothIcon,
    LinkIcon,
    QueueListIcon,
    Squares2X2Icon,
    StarIcon,
    SwatchIcon,
    WindowIcon,
} from "@heroicons/react/20/solid";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { isDevMode } from "@lib/utils/devMode";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { useQueryClient } from "@tanstack/react-query";

type NavBarProps = {
    workbench: Workbench;
};

const NavBarDivider: React.FC = () => {
    return <div className="bg-slate-200 h-[1px] w-full mt-4 mb-4" />;
};

export const NavBar: React.FC<NavBarProps> = (props) => {
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const [expanded, setExpanded] = React.useState<boolean>(localStorage.getItem("navBarExpanded") === "true");
    const [loadingEnsembles, setLoadingEnsembles] = React.useState<boolean>(false);
    const [drawerContent, setDrawerContent] = useStoreState(props.workbench.getGuiStateStore(), "drawerContent");
    const [settingsPanelWidth, setSettingsPanelWidth] = useStoreState(
        props.workbench.getGuiStateStore(),
        "settingsPanelWidthInPercent"
    );
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());

    const queryClient = useQueryClient();

    function ensureSettingsPanelIsVisible() {
        if (settingsPanelWidth <= 5) {
            setSettingsPanelWidth(20);
        }
    }

    function handleEnsembleClick() {
        setEnsembleDialogOpen(true);
    }

    function handleModuleSettingsClick() {
        ensureSettingsPanelIsVisible();
        setDrawerContent(DrawerContent.ModuleSettings);
    }

    function handleModulesListClick() {
        ensureSettingsPanelIsVisible();
        setDrawerContent(DrawerContent.ModulesList);
    }

    function handleTemplatesListClick() {
        ensureSettingsPanelIsVisible();
        setDrawerContent(DrawerContent.TemplatesList);
    }

    function handleSyncSettingsClick() {
        ensureSettingsPanelIsVisible();
        setDrawerContent(DrawerContent.SyncSettings);
    }

    function handleColorPaletteSettingsClick() {
        ensureSettingsPanelIsVisible();
        setDrawerContent(DrawerContent.ColorPaletteSettings);
    }

    function handleEnsembleDialogClose(selectedEnsembles: EnsembleItem[] | null) {
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
    }

    function handleCollapseOrExpand() {
        setExpanded(!expanded);
        localStorage.setItem("navBarExpanded", (!expanded).toString());
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
                expanded ? "w-64" : "w-[4.5rem]"
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
                            <QueueListIcon className="w-5 h-5 mr-2" />
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
                    title="Show module settings"
                    onClick={handleModuleSettingsClick}
                    startIcon={<Cog6ToothIcon className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.ModuleSettings ? "text-red-600" : "!text-slate-800"
                    )}
                >
                    {expanded ? "Module settings" : ""}
                </Button>
                <Button
                    title="Show sync settings"
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
                <Button
                    title="Show modules list"
                    onClick={handleModulesListClick}
                    startIcon={<WindowIcon className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.ModulesList ? "text-red-600" : "!text-slate-800"
                    )}
                >
                    {expanded ? "Add modules" : ""}
                </Button>
                <Button
                    title="Show templates list"
                    onClick={handleTemplatesListClick}
                    startIcon={<Squares2X2Icon className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.TemplatesList ? "text-red-600" : "!text-slate-800"
                    )}
                >
                    {expanded ? "Use templates" : ""}
                </Button>
                <NavBarDivider />
                <Button
                    title="Show color settings"
                    onClick={handleColorPaletteSettingsClick}
                    startIcon={<SwatchIcon className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.ColorPaletteSettings ? "text-red-600" : "!text-slate-800"
                    )}
                >
                    {expanded ? "Color settings" : ""}
                </Button>
                <NavBarDivider />
                <LoginButton className="w-full !text-slate-800 h-10" showText={expanded} />
                <div className="flex-grow h-5" />
                <NavBarDivider />
                <Button
                    title="Visit project on GitHub"
                    onClick={() => window.open("https://github.com/equinor/webviz", "_blank")}
                    className={resolveClassNames("w-full !text-slate-500 hover:!text-slate-800 h-10", {
                        "mb-16": isDevMode(),
                    })}
                    startIcon={<StarIcon className="w-5 h-5" />}
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
