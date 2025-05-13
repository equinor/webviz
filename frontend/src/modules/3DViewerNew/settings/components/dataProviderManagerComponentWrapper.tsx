import type React from "react";

import { Icon } from "@equinor/eds-core-react";
import { color_palette, fault, grid_layer, settings, surface_layer, wellbore } from "@equinor/eds-icons";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Menu } from "@lib/components/Menu";
import { MenuButton } from "@lib/components/MenuButton";
import { MenuHeading } from "@lib/components/MenuHeading";
import { MenuItem } from "@lib/components/MenuItem";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { GroupType } from "@modules/_shared/LayerFramework/groups/groupTypes";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { Dropdown } from "@mui/base";
import {
    Check,
    Panorama,
    SettingsApplications,
    Settings as SettingsIcon,
    TableRowsOutlined,
    ViewColumnOutlined,
} from "@mui/icons-material";

import { useAtom } from "jotai";

import { preferredViewLayoutAtom } from "../atoms/baseAtoms";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { GroupDelegateTopic, type GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { DeltaSurface } from "@modules/_shared/DataProviderFramework/framework/DeltaSurface/DeltaSurface";
import { SettingsGroup } from "@modules/_shared/DataProviderFramework/framework/SettingsGroup/SettingsGroup";
import { SharedSetting } from "@modules/_shared/DataProviderFramework/framework/SharedSetting/SharedSetting";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import {
    instanceofItemGroup,
    type Item,
    type ItemGroup,
} from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entities";
import { DataProvider } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import { RealizationSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/StatisticalSurfaceProvider";
import { ObservedSurfaceProvider } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/ObservedSurfaceProvider";
import { Group } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
import { DataProviderManagerComponent } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManagerComponent";
import type { ActionGroup } from "@modules/_shared/DataProviderFramework/Actions";

export type LayerManagerComponentWrapperProps = {
    layerManager: DataProviderManager;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function LayerManagerComponentWrapper(props: LayerManagerComponentWrapperProps): React.ReactNode {
    const colorSet = props.workbenchSettings.useColorSet();
    const [preferredViewLayout, setPreferredViewLayout] = useAtom(preferredViewLayoutAtom);

    const groupDelegate = props.layerManager.getGroupDelegate();
    usePublishSubscribeTopicValue(groupDelegate, GroupDelegateTopic.CHILDREN);

    function handleLayerAction(identifier: string, groupDelegate: GroupDelegate) {
        switch (identifier) {
            case "view":
                groupDelegate.appendChild(
                    GroupRegistry.makeGroup(GroupType.VIEW, props.layerManager, colorSet.getNextColor()),
                );
                return;
            case "delta-surface":
                groupDelegate.appendChild(new DeltaSurface("Delta surface", props.layerManager));
                return;
            case "settings-group":
                groupDelegate.appendChild(new SettingsGroup("Settings group", props.layerManager));
                return;
            case "color-scale":
                groupDelegate.appendChild(new SharedSetting(Setting.COLOR_SCALE, null, props.layerManager));
                return;
            case "statistical-surface":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(DataProviderType.STATISTICAL_SURFACE_3D, props.layerManager),
                );
                return;
            case "realization-surface":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(DataProviderType.REALIZATION_SURFACE_3D, props.layerManager),
                );
                return;
            case "realization-polygons":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(DataProviderType.REALIZATION_POLYGONS, props.layerManager),
                );
                return;
            case "drilled-wellbore-trajectories":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.DRILLED_WELL_TRAJECTORIES,
                        props.layerManager,
                    ),
                );
                return;
            case "drilled-wellbore-picks":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(DataProviderType.DRILLED_WELLBORE_PICKS, props.layerManager),
                );
                return;
            case "intersection-realization-grid":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.INTERSECTION_REALIZATION_GRID,
                        props.layerManager,
                    ),
                );
                return;
            case "realization-grid":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(DataProviderType.REALIZATION_GRID, props.layerManager),
                );
                return;
            case "realization-seismic-inline":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.REALIZATION_SEISMIC_INLINE,
                        props.layerManager,
                    ),
                );
                return;
            case "realization-seismic-crossline":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.REALIZATION_SEISMIC_CROSSLINE,
                        props.layerManager,
                    ),
                );
                return;
            case "realization-seismic-depth-slice":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.REALIZATION_SEISMIC_DEPTH_SLICE,
                        props.layerManager,
                    ),
                );
                return;
            case "ensemble":
                groupDelegate.appendChild(new SharedSetting(Setting.ENSEMBLE, null, props.layerManager));
                return;
            case "realization":
                groupDelegate.appendChild(new SharedSetting(Setting.REALIZATION, null, props.layerManager));
                return;
            case "surface-name":
                groupDelegate.appendChild(new SharedSetting(Setting.SURFACE_NAME, null, props.layerManager));
                return;
            case "attribute":
                groupDelegate.appendChild(new SharedSetting(Setting.ATTRIBUTE, null, props.layerManager));
                return;
            case "Date":
                groupDelegate.appendChild(new SharedSetting(Setting.TIME_OR_INTERVAL, null, props.layerManager));
                return;
        }
    }

    function checkIfItemMoveAllowed(movedItem: Item, destinationItem: ItemGroup): boolean {
        if (destinationItem instanceof DeltaSurface) {
            if (
                movedItem instanceof DataProvider &&
                !(
                    movedItem instanceof RealizationSurfaceProvider ||
                    movedItem instanceof StatisticalSurfaceProvider ||
                    movedItem instanceof ObservedSurfaceProvider
                )
            ) {
                return false;
            }

            if (instanceofItemGroup(movedItem)) {
                return false;
            }

            if (destinationItem.getGroupDelegate().findChildren((item) => item instanceof DataProvider).length >= 2) {
                return false;
            }
        }

        return true;
    }

    function makeActionsForGroup(group: ItemGroup): ActionGroup[] {
        const hasView =
            groupDelegate.getDescendantItems((item) => item instanceof Group && item.getGroupType() === GroupType.VIEW)
                .length > 0;

        const hasViewAncestor =
            group
                .getGroupDelegate()
                .getAncestors((item) => item instanceof Group && item.getGroupType() === GroupType.VIEW).length > 0;
        const actions: ActionGroup[] = [];

        if (!hasView) {
            return INITIAL_ACTIONS;
        }

        const groupActions: ActionGroup = {
            label: "Groups",
            children: [],
        };

        if (!hasViewAncestor) {
            groupActions.children.push({
                identifier: "view",
                icon: <Panorama fontSize="small" />,
                label: "View",
            });
        }

        groupActions.children.push({
            identifier: "settings-group",
            icon: <SettingsApplications fontSize="small" />,
            label: "Settings group",
        });

        actions.push(groupActions);
        actions.push(...ACTIONS);

        return actions;
    }

    return (
        <DataProviderManagerComponent
            title="Layers"
            dataProviderManager={props.layerManager}
            additionalHeaderComponents={
                <Dropdown>
                    <MenuButton label="Settings">
                        <SettingsIcon fontSize="inherit" />
                    </MenuButton>
                    <Menu>
                        <MenuHeading>Preferred view layout</MenuHeading>
                        <ViewLayoutMenuItem
                            checked={preferredViewLayout === PreferredViewLayout.HORIZONTAL}
                            onClick={() => setPreferredViewLayout(PreferredViewLayout.HORIZONTAL)}
                        >
                            <ViewColumnOutlined fontSize="inherit" /> Horizontal
                        </ViewLayoutMenuItem>
                        <ViewLayoutMenuItem
                            checked={preferredViewLayout === PreferredViewLayout.VERTICAL}
                            onClick={() => setPreferredViewLayout(PreferredViewLayout.VERTICAL)}
                        >
                            <TableRowsOutlined fontSize="inherit" /> Vertical
                        </ViewLayoutMenuItem>
                    </Menu>
                </Dropdown>
            }
            groupActions={makeActionsForGroup}
            onAction={handleLayerAction}
            isMoveAllowed={checkIfItemMoveAllowed}
        />
    );
}

type ViewLayoutMenuItemProps = {
    checked: boolean;
    onClick: () => void;
    children: React.ReactNode;
};

function ViewLayoutMenuItem(props: ViewLayoutMenuItemProps): React.ReactNode {
    return (
        <MenuItem onClick={props.onClick}>
            <div className="flex items-center gap-4">
                <div className="w-4">{props.checked && <Check fontSize="small" />}</div>
                <div className="flex gap-2 items-center">{props.children}</div>
            </div>
        </MenuItem>
    );
}

const INITIAL_ACTIONS: ActionGroup[] = [
    {
        label: "Groups",
        children: [
            {
                identifier: "view",
                icon: <Panorama fontSize="small" />,
                label: "View",
            },
            {
                identifier: "settings-group",
                icon: <SettingsApplications fontSize="small" />,
                label: "Settings group",
            },
        ],
    },
];

const ACTIONS: ActionGroup[] = [
    {
        label: "Layers",
        children: [
            {
                label: "Wells",
                children: [
                    {
                        identifier: "drilled-wellbore-trajectories",
                        icon: <Icon data={wellbore} fontSize="small" />,
                        label: "Drilled Wellbore Trajectories",
                    },
                    {
                        identifier: "drilled-wellbore-picks",
                        icon: <Icon data={wellbore} fontSize="small" />,
                        label: "Drilled Wellbore Picks",
                    },
                ],
            },
            {
                label: "Intersection",
                children: [
                    {
                        identifier: "intersection-realization-grid",
                        icon: <Icon data={grid_layer} fontSize="small" />,
                        label: "Intersection Realization Grid",
                    },
                ],
            },
            {
                label: "Reservoir grid",
                children: [
                    {
                        identifier: "realization-grid",
                        icon: <Icon data={grid_layer} fontSize="small" />,
                        label: "Realization Grid",
                    },
                ],
            },
            {
                label: "Surface",
                children: [
                    {
                        identifier: "statistical-surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Statistical Surface",
                    },
                    {
                        identifier: "realization-surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Realization Surface",
                    },
                ],
            },
            {
                label: "Polygons",
                children: [
                    {
                        identifier: "realization-polygons",
                        icon: <Icon data={fault} fontSize="small" />,
                        label: "Realization Polygons",
                    },
                ],
            },
            {
                label: "Seismic",
                children: [
                    {
                        label: "Synthetic",
                        children: [
                            {
                                identifier: "realization-seismic-inline",
                                icon: <Icon data={surface_layer} fontSize="small" />,
                                label: "Realization Inline",
                            },
                            {
                                identifier: "realization-seismic-crossline",
                                icon: <Icon data={surface_layer} fontSize="small" />,
                                label: "Realization Crossline",
                            },
                            {
                                identifier: "realization-seismic-depth-slice",
                                icon: <Icon data={surface_layer} fontSize="small" />,
                                label: "Realization Depth Slice",
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        label: "Shared Settings",
        children: [
            {
                identifier: "ensemble",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Ensemble",
            },
            {
                identifier: "realization",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Realization",
            },
            {
                identifier: "attribute",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Attribute",
            },
            {
                identifier: "Date",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Date",
            },
        ],
    },
    {
        label: "Utilities",
        children: [
            {
                identifier: "color-scale",
                icon: <Icon data={color_palette} fontSize="small" />,
                label: "Color scale",
            },
        ],
    },
];
