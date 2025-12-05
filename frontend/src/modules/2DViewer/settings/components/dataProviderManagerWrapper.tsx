import type React from "react";

import { Icon } from "@equinor/eds-core-react";
import { color_palette, fault, grid_layer, settings, surface_layer, wellbore } from "@equinor/eds-icons";
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

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import { useColorSet, type WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Menu } from "@lib/components/Menu";
import { MenuButton } from "@lib/components/MenuButton";
import { MenuHeading } from "@lib/components/MenuHeading";
import { MenuItem } from "@lib/components/MenuItem";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { CustomDataProviderType } from "@modules/2DViewer/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { PreferredViewLayout } from "@modules/_shared/components/SubsurfaceViewer/typesAndEnums";
import type { ActionGroup } from "@modules/_shared/DataProviderFramework/Actions";
import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { AttributeSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/AttributeSurfaceProvider";
import { DepthSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/DepthSurfaceProvider";
import { SeismicSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/surfaceProviders/SeismicSurfaceProvider";
import type { GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { DataProvider } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerComponent } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManagerComponent";
import { DeltaSurface } from "@modules/_shared/DataProviderFramework/framework/DeltaSurface/DeltaSurface";
import { Group } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
import { SettingsGroup } from "@modules/_shared/DataProviderFramework/framework/SettingsGroup/SettingsGroup";
import { SharedSetting } from "@modules/_shared/DataProviderFramework/framework/SharedSetting/SharedSetting";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type { Item, ItemGroup } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entities";
import { instanceofItemGroup } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entities";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";

import { preferredViewLayoutAtom } from "../atoms/baseAtoms";

export type LayerManagerComponentWrapperProps = {
    dataProviderManager: DataProviderManager;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function DataProviderManagerWrapper(props: LayerManagerComponentWrapperProps): React.ReactNode {
    const colorSet = useColorSet(props.workbenchSettings);
    const [preferredViewLayout, setPreferredViewLayout] = useAtom(preferredViewLayoutAtom);

    const groupDelegate = props.dataProviderManager.getGroupDelegate();
    usePublishSubscribeTopicValue(groupDelegate, GroupDelegateTopic.CHILDREN);

    function handleLayerAction(identifier: string, groupDelegate: GroupDelegate) {
        switch (identifier) {
            case "view":
                groupDelegate.appendChild(
                    GroupRegistry.makeGroup(GroupType.VIEW, props.dataProviderManager, colorSet.getNextColor()),
                );
                return;
            case "delta-surface":
                groupDelegate.prependChild(new DeltaSurface("Delta surface", props.dataProviderManager));
                return;
            case "settings-group":
                groupDelegate.prependChild(new SettingsGroup("Settings group", props.dataProviderManager));
                return;

            case "depth-surface":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(DataProviderType.DEPTH_SURFACE, props.dataProviderManager),
                );
                return;

            case "seismic-3d-surface":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.SEISMIC_3D_SURFACE,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "seismic-4d-surface":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.SEISMIC_4D_SURFACE,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "attribute-static-surface":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.ATTRIBUTE_STATIC_SURFACE,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "attribute-time-step-surface":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.ATTRIBUTE_TIME_STEP_SURFACE,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "attribute-interval-surface":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.ATTRIBUTE_INTERVAL_SURFACE,
                        props.dataProviderManager,
                    ),
                );
                return;

            case "fault-polygons":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(DataProviderType.FAULT_POLYGONS, props.dataProviderManager),
                );
                return;
            case "unsorted-polygons":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.REALIZATION_POLYGONS,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "drilled-wellbore-trajectories":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.DRILLED_WELL_TRAJECTORIES,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "drilled-wellbore-picks":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.DRILLED_WELLBORE_PICKS,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "realization-grid":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        CustomDataProviderType.REALIZATION_GRID_2D,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "ensemble":
                groupDelegate.appendChild(new SharedSetting(Setting.ENSEMBLE, null, props.dataProviderManager));
                return;
            case "realization":
                groupDelegate.appendChild(new SharedSetting(Setting.REALIZATION, null, props.dataProviderManager));
                return;
            case "surface-name":
                groupDelegate.appendChild(new SharedSetting(Setting.SURFACE_NAME, null, props.dataProviderManager));
                return;
            case "formation-name":
                groupDelegate.appendChild(new SharedSetting(Setting.FORMATION_NAME, null, props.dataProviderManager));
                return;
            case "attribute":
                groupDelegate.appendChild(new SharedSetting(Setting.ATTRIBUTE, null, props.dataProviderManager));
                return;
            case "seismic-attribute":
                groupDelegate.appendChild(
                    new SharedSetting(Setting.SEISMIC_ATTRIBUTE, null, props.dataProviderManager),
                );
                return;
            case "depth-attribute":
                groupDelegate.appendChild(new SharedSetting(Setting.DEPTH_ATTRIBUTE, null, props.dataProviderManager));
                return;
            case "time-point":
                groupDelegate.appendChild(new SharedSetting(Setting.TIME_POINT, null, props.dataProviderManager));
                return;
            case "time-interval":
                groupDelegate.appendChild(new SharedSetting(Setting.TIME_INTERVAL, null, props.dataProviderManager));
                return;
            case "color-scale":
                groupDelegate.prependChild(new SharedSetting(Setting.COLOR_SCALE, null, props.dataProviderManager));
                return;
            case "seismic-color-scale":
                groupDelegate.prependChild(
                    new SharedSetting(Setting.SEISMIC_COLOR_SCALE, null, props.dataProviderManager),
                );
                return;
            case "depth-color-scale":
                groupDelegate.prependChild(
                    new SharedSetting(Setting.DEPTH_COLOR_SCALE, null, props.dataProviderManager),
                );
                return;
        }
    }

    function checkIfItemMoveAllowed(movedItem: Item, destinationItem: ItemGroup): boolean {
        if (destinationItem instanceof DeltaSurface) {
            if (
                movedItem instanceof DataProvider &&
                !(movedItem instanceof AttributeSurfaceProvider) &&
                !(movedItem instanceof SeismicSurfaceProvider) &&
                !(movedItem instanceof DepthSurfaceProvider)
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
            title={"Layers"}
            dataProviderManager={props.dataProviderManager}
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
                label: "Surfaces",
                children: [
                    {
                        identifier: "depth-surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Depth",
                    },
                    {
                        identifier: "seismic-3d-surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Seismic 3D",
                    },
                    {
                        identifier: "seismic-4d-surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Seismic 4D",
                    },
                    {
                        identifier: "attribute-static-surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Uncategorized (Static)",
                    },
                    {
                        identifier: "attribute-time-step-surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Uncategorized (Time Step)",
                    },
                    {
                        identifier: "attribute-interval-surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Uncategorized (Time Interval)",
                    },
                ],
            },
            {
                label: "Wells",
                children: [
                    {
                        identifier: "drilled-wellbore-trajectories",
                        icon: <Icon data={wellbore} fontSize="small" />,
                        label: "Trajectories (Official)",
                    },
                    {
                        identifier: "drilled-wellbore-picks",
                        icon: <Icon data={wellbore} fontSize="small" />,
                        label: "Picks (Official)",
                    },
                ],
            },
            {
                label: "Polygons",
                children: [
                    {
                        identifier: "fault-polygons",
                        icon: <Icon data={fault} fontSize="small" />,
                        label: "Fault Polygons",
                    },
                    {
                        identifier: "unsorted-polygons",
                        icon: <Icon data={fault} fontSize="small" />,
                        label: "Unsorted Polygons",
                    },
                ],
            },
            {
                label: "Others",
                children: [
                    {
                        identifier: "realization-grid",
                        icon: <Icon data={grid_layer} fontSize="small" />,
                        label: "Grid Model layer",
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
                identifier: "surface-name",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Surface Name",
            },
            {
                identifier: "formation-name",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Formation Name",
            },
            {
                identifier: "attribute",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Unsorted Attribute",
            },
            {
                identifier: "seismic-attribute",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Seismic Attribute",
            },
            {
                identifier: "depth-attribute",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Depth Attribute",
            },
            {
                identifier: "time-point",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Time point",
            },
            {
                identifier: "time-interval",
                icon: <Icon data={settings} fontSize="small" />,
                label: "Time interval",
            },
            {
                identifier: "color-scale",
                icon: <Icon data={color_palette} fontSize="small" />,
                label: "Attribute Color scale",
            },
            {
                identifier: "seismic-color-scale",
                icon: <Icon data={color_palette} fontSize="small" />,
                label: "Seismic Color scale",
            },
            {
                identifier: "depth-color-scale",
                icon: <Icon data={color_palette} fontSize="small" />,
                label: "Depth Color scale",
            },
        ],
    },
];
