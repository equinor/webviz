import React from "react";

import { GridView, Link, List, Palette, Settings, WebAsset } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { DashboardTopic } from "@framework/Dashboard";
import { GuiState, LeftDrawerContent, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { SelectEnsemblesDialog } from "@framework/internal/components/SelectEnsemblesDialog";
import type {
    BaseEnsembleItem,
    DeltaEnsembleItem,
    RegularEnsembleItem,
} from "@framework/internal/components/SelectEnsemblesDialog";
import type { UserDeltaEnsembleSetting, UserEnsembleSetting } from "@framework/internal/EnsembleSetLoader";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/PrivateWorkbenchSession";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { Workbench } from "@framework/Workbench";
import { useColorSet } from "@framework/WorkbenchSettings";
import { Badge } from "@lib/components/Badge";
import { CircularProgress } from "@lib/components/CircularProgress";
import { NavBarButton, NavBarDivider } from "@lib/components/NavBarComponents";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

type LeftNavBarProps = {
    workbench: Workbench;
};

export const LeftNavBar: React.FC<LeftNavBarProps> = (props) => {
    const ensembleSet = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.ENSEMBLE_SET,
    );
    const dashboard = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.ACTIVE_DASHBOARD,
    );
    const layout = usePublishSubscribeTopicValue(dashboard, DashboardTopic.Layout);
    const [ensembleDialogOpen, setEnsembleDialogOpen] = React.useState<boolean>(false);
    const [newSelectedEnsembles, setNewSelectedEnsembles] = React.useState<RegularEnsembleItem[]>([]);
    const [newCreatedDeltaEnsembles, setNewCreatedDeltaEnsembles] = React.useState<DeltaEnsembleItem[]>([]);
    const [layoutEmpty, setLayoutEmpty] = React.useState<boolean>(dashboard.getLayout().length === 0);
    const [prevIsAppInitialized, setPrevIsAppInitialized] = React.useState<boolean>(false);
    const loadingEnsembleSet = usePublishSubscribeTopicValue(
        props.workbench.getWorkbenchSession(),
        PrivateWorkbenchSessionTopic.IS_ENSEMBLE_SET_LOADING,
    );
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
    const colorSet = useColorSet(props.workbench.getWorkbenchSettings());

    React.useEffect(
        function reactToModuleInstancesChanged() {
            if (
                layout.length === 0 &&
                [LeftDrawerContent.ModuleSettings, LeftDrawerContent.SyncSettings].includes(drawerContent)
            ) {
                setDrawerContent(LeftDrawerContent.ModulesList);
            }
            setLayoutEmpty(layout.length === 0);
        },
        [layout, drawerContent, setDrawerContent],
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
        return props.workbench
            .getWorkbenchSession()
            .storeSettingsInLocalStorageAndLoadAndSetupEnsembleSetInSession(
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
                "bg-white p-2 pt-4 border-r-2 border-slate-200 z-50 shadow-lg flex flex-col w-16",
            )}
        >
            <div className="flex flex-col gap-2 grow">
                <NavBarButton
                    active={ensembleDialogOpen}
                    title="Open ensemble selection dialog"
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
                    title="Show module settings"
                    icon={<Settings fontSize="small" className="size-5" />}
                    onClick={handleModuleSettingsClick}
                    disabled={layoutEmpty}
                />
                <NavBarButton
                    active={drawerContent === LeftDrawerContent.SyncSettings}
                    disabled={layoutEmpty}
                    title="Show sync settings"
                    icon={<Link fontSize="small" className="size-5" />}
                    onClick={handleSyncSettingsClick}
                />

                <NavBarDivider />

                <NavBarButton
                    active={drawerContent === LeftDrawerContent.ModulesList}
                    title="Show modules list"
                    icon={<WebAsset fontSize="small" className="size-5" />}
                    onClick={handleModulesListClick}
                />
                <NavBarButton
                    active={drawerContent === LeftDrawerContent.TemplatesList}
                    title="Show templates list"
                    icon={<GridView fontSize="small" className="size-5" />}
                    onClick={handleTemplatesListClick}
                />

                <NavBarDivider />

                <NavBarButton
                    active={drawerContent === LeftDrawerContent.ColorPaletteSettings}
                    title="Show color settings"
                    icon={<Palette fontSize="small" className="size-5" />}
                    onClick={handleColorPaletteSettingsClick}
                />

                <div className="grow h-5" />
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
