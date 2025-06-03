import React from "react";

import { ChevronLeft, ChevronRight, GridView, Link, List, Palette, Settings, WebAsset } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import FmuLogo from "@assets/fmu.svg";

import { GuiState, LeftDrawerContent, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { LoginButton } from "@framework/internal/components/LoginButton";
import { SelectEnsemblesDialog } from "@framework/internal/components/SelectEnsemblesDialog";
import type {
    BaseEnsembleItem,
    DeltaEnsembleItem,
    RegularEnsembleItem,
} from "@framework/internal/components/SelectEnsemblesDialog/selectEnsemblesDialog";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { UserDeltaEnsembleSetting, UserEnsembleSetting, Workbench } from "@framework/Workbench";
import { WorkbenchEvents } from "@framework/Workbench";
import { useEnsembleSet, useIsEnsembleSetLoading } from "@framework/WorkbenchSession";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { NavBarButton, NavBarDivider } from "@lib/components/NavBarComponents";
import { isDevMode } from "@lib/utils/devMode";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { UserSessionState } from "./private-components/UserSessionState";

type LeftNavBarProps = {
    workbench: Workbench;
};

export const LeftNavBar: React.FC<LeftNavBarProps> = (props) => {
    const ensembleSet = useEnsembleSet(props.workbench.getWorkbenchSession());
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const [newSelectedEnsembles, setNewSelectedEnsembles] = React.useState<RegularEnsembleItem[]>([]);
    const [newCreatedDeltaEnsembles, setNewCreatedDeltaEnsembles] = React.useState<DeltaEnsembleItem[]>([]);
    const [layoutEmpty, setLayoutEmpty] = React.useState<boolean>(props.workbench.getLayout().length === 0);
    const [collapsed, setCollapsed] = React.useState<boolean>(localStorage.getItem("navBarCollapsed") === "true");
    const [prevIsAppInitialized, setPrevIsAppInitialized] = React.useState<boolean>(false);
    const loadingEnsembleSet = useIsEnsembleSetLoading(props.workbench.getWorkbenchSession());
    const [drawerContent, setDrawerContent] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftDrawerContent,
    );
    const [leftSettingsPanelWidth, setLeftSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelWidthInPercent,
    );
    const isAppInitialized = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.AppInitialized);

    if (isAppInitialized !== prevIsAppInitialized && !loadingEnsembleSet) {
        setEnsembleDialogOpen(ensembleSet.getEnsembleArray().length === 0);
        setPrevIsAppInitialized(isAppInitialized);
    }

    const queryClient = useQueryClient();
    const colorSet = props.workbench.getWorkbenchSettings().useColorSet();

    React.useEffect(
        function reactToModuleInstancesChanged() {
            function listener() {
                if (
                    props.workbench.getLayout().length === 0 &&
                    [LeftDrawerContent.ModuleSettings, LeftDrawerContent.SyncSettings].includes(drawerContent)
                ) {
                    setDrawerContent(LeftDrawerContent.ModulesList);
                }
                setLayoutEmpty(props.workbench.getLayout().length === 0);
            }

            const unsubscribeFunc = props.workbench.subscribe(WorkbenchEvents.ModuleInstancesChanged, listener);

            return () => {
                unsubscribeFunc();
            };
        },
        [drawerContent, props.workbench, setDrawerContent],
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
        setDrawerContent(LeftDrawerContent.ModuleSettings);
    }

    function handleModulesListClick() {
        ensureSettingsPanelIsVisible();
        setDrawerContent(LeftDrawerContent.ModulesList);
    }

    function handleTemplatesListClick() {
        ensureSettingsPanelIsVisible();
        setDrawerContent(LeftDrawerContent.TemplatesList);
    }

    function handleSyncSettingsClick() {
        ensureSettingsPanelIsVisible();
        setDrawerContent(LeftDrawerContent.SyncSettings);
    }

    function handleColorPaletteSettingsClick() {
        ensureSettingsPanelIsVisible();
        setDrawerContent(LeftDrawerContent.ColorPaletteSettings);
    }

    function handleEnsembleDialogClose() {
        setEnsembleDialogOpen(false);
    }

    function handleCollapseOrExpand() {
        setCollapsed(!collapsed);
        localStorage.setItem("navBarCollapsed", (!collapsed).toString());
    }

    function loadAndSetupEnsembles(
        ensembleItems: RegularEnsembleItem[],
        createdDeltaEnsembles: DeltaEnsembleItem[],
    ): Promise<void> {
        setNewSelectedEnsembles(ensembleItems);
        setNewCreatedDeltaEnsembles(createdDeltaEnsembles);
        const ensembleSettings: UserEnsembleSetting[] = ensembleItems.map((ens) => ({
            ensembleIdent: new RegularEnsembleIdent(ens.caseUuid, ens.ensembleName),
            customName: ens.customName,
            color: ens.color,
        }));
        const deltaEnsembleSettings: UserDeltaEnsembleSetting[] = createdDeltaEnsembles.map((deltaEns) => ({
            comparisonEnsembleIdent: new RegularEnsembleIdent(
                deltaEns.comparisonEnsemble.caseUuid,
                deltaEns.comparisonEnsemble.ensembleName,
            ),
            referenceEnsembleIdent: new RegularEnsembleIdent(
                deltaEns.referenceEnsemble.caseUuid,
                deltaEns.referenceEnsemble.ensembleName,
            ),
            customName: deltaEns.customName,
            color: deltaEns.color,
        }));
        return props.workbench.storeSettingsInLocalStorageAndLoadAndSetupEnsembleSetInSession(
            queryClient,
            ensembleSettings,
            deltaEnsembleSettings,
        );
    }

    const selectedEnsembles: RegularEnsembleItem[] = ensembleSet.getRegularEnsembleArray().map((ens) => ({
        caseUuid: ens.getCaseUuid(),
        caseName: ens.getCaseName(),
        ensembleName: ens.getEnsembleName(),
        color: ens.getColor(),
        customName: ens.getCustomName(),
    }));

    let fixedSelectedEnsembles = selectedEnsembles;
    if (loadingEnsembleSet) {
        fixedSelectedEnsembles = newSelectedEnsembles;
    }

    const createdDeltaEnsembles: DeltaEnsembleItem[] = ensembleSet.getDeltaEnsembleArray().map((deltaEns) => {
        const comparisonEnsemble: BaseEnsembleItem = {
            caseUuid: deltaEns.getComparisonEnsembleIdent().getCaseUuid(),
            ensembleName: deltaEns.getComparisonEnsembleIdent().getEnsembleName(),
        };
        const referenceEnsemble: BaseEnsembleItem = {
            caseUuid: deltaEns.getReferenceEnsembleIdent().getCaseUuid(),
            ensembleName: deltaEns.getReferenceEnsembleIdent().getEnsembleName(),
        };

        const deltaEnsembleItem: DeltaEnsembleItem = {
            comparisonEnsemble: comparisonEnsemble,
            referenceEnsemble: referenceEnsemble,
            color: deltaEns.getColor(),
            customName: deltaEns.getCustomName(),
        };
        return deltaEnsembleItem;
    });
    let fixedCreatedDeltaEnsembles = createdDeltaEnsembles;
    if (loadingEnsembleSet) {
        fixedCreatedDeltaEnsembles = newCreatedDeltaEnsembles;
    }

    return (
        <div
            className={resolveClassNames(
                "bg-white p-2 border-r-2 border-slate-200 z-50 shadow-lg flex flex-col",
                collapsed ? "w-[4.5rem]" : "w-64",
            )}
        >
            <div className="flex flex-col gap-2 grow">
                <div className="w-full flex flex-col justify-center items-center gap-4 mb-2 mt-1 p-2 h-32">
                    <img src={FmuLogo} alt="FMU Analysis logo" className="w-20 h-20" />
                    {collapsed ? null : <h1 className="text-xl text-slate-800">FMU Analysis</h1>}
                </div>
                <div
                    className="bg-orange-600 text-white p-1 rounded-sm text-xs text-center cursor-help shadow-sm"
                    title="NOTE: This application is still under heavy development and bugs are to be expected. Please help us improve Webviz by reporting any undesired behaviour either on Slack or Yammer."
                >
                    BETA
                </div>
                <div className="flex justify-end">
                    <Button
                        onClick={handleCollapseOrExpand}
                        className="text-slate-800!"
                        title={collapsed ? "Expand menu" : "Collapse menu"}
                    >
                        {collapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
                    </Button>
                </div>
                <NavBarDivider />

                <NavBarButton
                    collapsed={collapsed}
                    active={ensembleDialogOpen}
                    title="Open ensemble selection dialog"
                    text="Ensembles"
                    icon={
                        <Badge
                            invisible={
                                selectedEnsembles.length === 0 &&
                                createdDeltaEnsembles.length === 0 &&
                                !loadingEnsembleSet
                            }
                            color="bg-blue-500"
                            badgeContent={
                                loadingEnsembleSet ? (
                                    <CircularProgress size="extra-small" color="inherit" />
                                ) : (
                                    selectedEnsembles.length + createdDeltaEnsembles.length
                                )
                            }
                        >
                            <List fontSize="small" className="size-5" />
                        </Badge>
                    }
                    onClick={handleEnsembleClick}
                />

                <NavBarDivider />

                <NavBarButton
                    active={drawerContent === LeftDrawerContent.ModuleSettings}
                    collapsed={collapsed}
                    title="Show module settings"
                    text="Module settings"
                    icon={<Settings fontSize="small" className="size-5" />}
                    onClick={handleModuleSettingsClick}
                    disabled={layoutEmpty}
                />
                <NavBarButton
                    active={drawerContent === LeftDrawerContent.SyncSettings}
                    collapsed={collapsed}
                    disabled={layoutEmpty}
                    title="Show sync settings"
                    text="Sync settings"
                    icon={<Link fontSize="small" className="size-5" />}
                    onClick={handleSyncSettingsClick}
                />

                <NavBarDivider />

                <NavBarButton
                    active={drawerContent === LeftDrawerContent.ModulesList}
                    collapsed={collapsed}
                    title="Show modules list"
                    text="Add modules"
                    icon={<WebAsset fontSize="small" className="size-5" />}
                    onClick={handleModulesListClick}
                />
                <NavBarButton
                    active={drawerContent === LeftDrawerContent.TemplatesList}
                    collapsed={collapsed}
                    title="Show templates list"
                    text="Use templates"
                    icon={<GridView fontSize="small" className="size-5" />}
                    onClick={handleTemplatesListClick}
                />

                <NavBarDivider />

                <NavBarButton
                    active={drawerContent === LeftDrawerContent.ColorPaletteSettings}
                    collapsed={collapsed}
                    title="Show color settings"
                    text="Color settings"
                    icon={<Palette fontSize="small" className="size-5" />}
                    onClick={handleColorPaletteSettingsClick}
                />

                <NavBarDivider />

                <LoginButton className="w-full text-slate-800! h-10" showText={!collapsed} />

                <div className="grow h-5" />
                <div className={isDevMode() ? "mb-16" : ""}>
                    <NavBarDivider />
                    <UserSessionState expanded={!collapsed} />
                </div>
            </div>
            {ensembleDialogOpen && (
                <SelectEnsemblesDialog
                    loadAndSetupEnsembles={loadAndSetupEnsembles}
                    selectedRegularEnsembles={fixedSelectedEnsembles}
                    createdDeltaEnsembles={fixedCreatedDeltaEnsembles}
                    onClose={handleEnsembleDialogClose}
                    colorSet={colorSet}
                />
            )}
        </div>
    );
};
