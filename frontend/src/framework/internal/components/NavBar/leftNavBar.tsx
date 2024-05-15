import React from "react";

import WebvizLogo from "@assets/webviz.svg";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { DrawerContent, GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { UserEnsembleSetting, Workbench, WorkbenchEvents } from "@framework/Workbench";
import { useEnsembleSet, useIsEnsembleSetLoading } from "@framework/WorkbenchSession";
import { LoginButton } from "@framework/internal/components/LoginButton";
import { SelectEnsemblesDialog } from "@framework/internal/components/SelectEnsemblesDialog";
import { EnsembleItem } from "@framework/internal/components/SelectEnsemblesDialog/selectEnsemblesDialog";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { isDevMode } from "@lib/utils/devMode";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { ChevronLeft, ChevronRight, GridView, Link, List, Palette, Settings, WebAsset } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { UserSessionState } from "./private-components/UserSessionState";

type LeftNavBarProps = {
    workbench: Workbench;
};

const NavBarDivider: React.FC = () => {
    return <div className="bg-slate-200 h-[1px] w-full mt-4 mb-4" />;
};

export const LeftNavBar: React.FC<LeftNavBarProps> = (props) => {
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const [newSelectedEnsembles, setNewSelectedEnsembles] = React.useState<EnsembleItem[]>([]);
    const [layoutEmpty, setLayoutEmpty] = React.useState<boolean>(props.workbench.getLayout().length === 0);
    const [expanded, setExpanded] = React.useState<boolean>(localStorage.getItem("navBarExpanded") === "true");
    const loadingEnsembleSet = useIsEnsembleSetLoading(props.workbench.getWorkbenchSession());
    const [drawerContent, setDrawerContent] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.DrawerContent
    );
    const [leftSettingsPanelWidth, setLeftSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelWidthInPercent
    );
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());

    const queryClient = useQueryClient();
    const colorSet = props.workbench.getWorkbenchSettings().useColorSet();

    React.useEffect(
        function reactToModuleInstancesChanged() {
            function listener() {
                if (
                    props.workbench.getLayout().length === 0 &&
                    [DrawerContent.ModuleSettings, DrawerContent.SyncSettings].includes(drawerContent)
                ) {
                    setDrawerContent(DrawerContent.ModulesList);
                }
                setLayoutEmpty(props.workbench.getLayout().length === 0);
            }

            const unsubscribeFunc = props.workbench.subscribe(WorkbenchEvents.ModuleInstancesChanged, listener);

            return () => {
                unsubscribeFunc();
            };
        },
        [drawerContent, props.workbench, setDrawerContent]
    );

    function ensureSettingsPanelIsVisible() {
        if (leftSettingsPanelWidth <= 5) {
            setLeftSettingsPanelWidth(20);
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

    function handleEnsembleDialogClose() {
        setEnsembleDialogOpen(false);
    }

    function handleCollapseOrExpand() {
        setExpanded(!expanded);
        localStorage.setItem("navBarExpanded", (!expanded).toString());
    }

    const selectedEnsembles: EnsembleItem[] = ensembleSet.getEnsembleArr().map((ens) => ({
        caseUuid: ens.getCaseUuid(),
        caseName: ens.getCaseName(),
        ensembleName: ens.getEnsembleName(),
        color: ens.getColor(),
        customName: ens.getCustomName(),
    }));

    function loadAndSetupEnsembles(ensembleItems: EnsembleItem[]): Promise<void> {
        setNewSelectedEnsembles(ensembleItems);
        const ensembleSettings: UserEnsembleSetting[] = ensembleItems.map((ens) => ({
            ensembleIdent: new EnsembleIdent(ens.caseUuid, ens.ensembleName),
            customName: ens.customName,
            color: ens.color,
        }));
        return props.workbench.loadAndSetupEnsembleSetInSession(queryClient, ensembleSettings);
    }

    let fixedSelectedEnsembles = selectedEnsembles;
    if (loadingEnsembleSet) {
        fixedSelectedEnsembles = newSelectedEnsembles;
    }

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
                <div
                    className="bg-orange-600 text-white p-1 rounded text-xs text-center cursor-help shadow"
                    title="NOTE: This application is still under heavy development and bugs are to be expected. Please help us improve Webviz by reporting any undesired behaviour either on Slack or Yammer."
                >
                    BETA
                </div>
                <div className="flex justify-end">
                    <Button
                        onClick={handleCollapseOrExpand}
                        className="!text-slate-800"
                        title={expanded ? "Collapse menu" : "Expand menu"}
                    >
                        {expanded ? <ChevronLeft fontSize="small" /> : <ChevronRight fontSize="small" />}
                    </Button>
                </div>
                <NavBarDivider />
                <Button
                    title="Open ensemble selection dialog"
                    onClick={handleEnsembleClick}
                    className="w-full !text-slate-800 h-10"
                    startIcon={
                        selectedEnsembles.length === 0 && !loadingEnsembleSet ? (
                            <List fontSize="small" className="w-5 h-5 mr-2" />
                        ) : (
                            <Badge
                                className="mr-2"
                                color="bg-blue-500"
                                badgeContent={
                                    loadingEnsembleSet ? (
                                        <CircularProgress size="extra-small" color="inherit" />
                                    ) : (
                                        selectedEnsembles.length
                                    )
                                }
                            >
                                <List fontSize="small" className="w-5 h-5" />
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
                    startIcon={<Settings fontSize="small" className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.ModuleSettings ? "text-cyan-600" : "!text-slate-800"
                    )}
                    disabled={layoutEmpty}
                >
                    {expanded ? "Module settings" : ""}
                </Button>
                <Button
                    title="Show sync settings"
                    onClick={handleSyncSettingsClick}
                    startIcon={<Link fontSize="small" className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.SyncSettings ? "text-cyan-600" : "!text-slate-800"
                    )}
                    disabled={layoutEmpty}
                >
                    {expanded ? "Sync settings" : ""}
                </Button>
                <NavBarDivider />
                <Button
                    title="Show modules list"
                    onClick={handleModulesListClick}
                    startIcon={<WebAsset fontSize="small" className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.ModulesList ? "text-cyan-600" : "!text-slate-800"
                    )}
                >
                    {expanded ? "Add modules" : ""}
                </Button>
                <Button
                    title="Show templates list"
                    onClick={handleTemplatesListClick}
                    startIcon={<GridView fontSize="small" className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.TemplatesList ? "text-cyan-600" : "!text-slate-800"
                    )}
                >
                    {expanded ? "Use templates" : ""}
                </Button>
                <NavBarDivider />
                <Button
                    title="Show color settings"
                    onClick={handleColorPaletteSettingsClick}
                    startIcon={<Palette fontSize="small" className="w-5 h-5 mr-2" />}
                    className={resolveClassNames(
                        "w-full",
                        "h-10",
                        drawerContent === DrawerContent.ColorPaletteSettings ? "text-cyan-600" : "!text-slate-800"
                    )}
                >
                    {expanded ? "Color settings" : ""}
                </Button>
                <NavBarDivider />
                <LoginButton className="w-full !text-slate-800 h-10" showText={expanded} />
                <div className="flex-grow h-5" />
                <div className={isDevMode() ? "mb-16" : ""}>
                    <NavBarDivider />
                    <UserSessionState expanded={expanded} />
                </div>
            </div>
            {ensembleDialogOpen && (
                <SelectEnsemblesDialog
                    loadAndSetupEnsembles={loadAndSetupEnsembles}
                    selectedEnsembles={fixedSelectedEnsembles}
                    onClose={handleEnsembleDialogClose}
                    colorSet={colorSet}
                />
            )}
        </div>
    );
};
