import type React from "react";

import { Icon } from "@equinor/eds-core-react";
import { color_palette, fault, grid_layer, settings, surface_layer, wellbore } from "@equinor/eds-icons";
import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Menu } from "@lib/components/Menu";
import { MenuButton } from "@lib/components/MenuButton";
import { MenuHeading } from "@lib/components/MenuHeading";
import { MenuItem } from "@lib/components/MenuItem";
import { ObservedSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/ObservedSurfaceLayer";
import { RealizationSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/StatisticalSurfaceLayer";
import { CustomLayerType } from "@modules/2DViewer/LayerFramework/customLayerImplementations/layerTypes";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import type { LayersActionGroup } from "@modules/_shared/DataProviderFramework/LayersActions";
import type { GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { DeltaSurface } from "@modules/_shared/DataProviderFramework/framework/DeltaSurface/DeltaSurface";
import { Group } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
import { SettingsGroup } from "@modules/_shared/DataProviderFramework/framework/SettingsGroup/SettingsGroup";
import { SharedSetting } from "@modules/_shared/DataProviderFramework/framework/SharedSetting/SharedSetting";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type { Item, ItemGroup } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entitites";
import { instanceofItemGroup } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entitites";
import { LayerRegistry } from "@modules/_shared/DataProviderFramework/layers/LayerRegistry";
import { LayerType } from "@modules/_shared/DataProviderFramework/layers/layerTypes";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { DataProvider } from "@modules/_shared/LayerFramework/framework/DataProvider/DataProvider";
import type { DataProviderManager } from "@modules/_shared/LayerFramework/framework/DataProviderManager/DataProviderManager";
import { LayerManagerComponent } from "@modules/_shared/LayerFramework/framework/DataProviderManager/DataProviderManagerComponent";
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
            case "observed-surface":
                groupDelegate.prependChild(
                    LayerRegistry.makeLayer(CustomLayerType.OBSERVED_SURFACE, props.layerManager),
                );
                return;
            case "statistical-surface":
                groupDelegate.prependChild(
                    LayerRegistry.makeLayer(CustomLayerType.STATISTICAL_SURFACE, props.layerManager),
                );
                return;
            case "realization-surface":
                groupDelegate.prependChild(
                    LayerRegistry.makeLayer(CustomLayerType.REALIZATION_SURFACE, props.layerManager),
                );
                return;
            case "realization-polygons":
                groupDelegate.prependChild(
                    LayerRegistry.makeLayer(CustomLayerType.REALIZATION_POLYGONS, props.layerManager),
                );
                return;
            case "drilled-wellbore-trajectories":
                groupDelegate.prependChild(
                    LayerRegistry.makeLayer(LayerType.DRILLED_WELL_TRAJECTORIES, props.layerManager),
                );
                return;
            case "drilled-wellbore-picks":
                groupDelegate.prependChild(
                    LayerRegistry.makeLayer(LayerType.DRILLED_WELLBORE_PICKS, props.layerManager),
                );
                return;
            case "realization-grid":
                groupDelegate.prependChild(
                    LayerRegistry.makeLayer(CustomLayerType.REALIZATION_GRID, props.layerManager),
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
                    movedItem instanceof RealizationSurfaceLayer ||
                    movedItem instanceof StatisticalSurfaceLayer ||
                    movedItem instanceof ObservedSurfaceLayer
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

    const hasView =
        groupDelegate.getDescendantItems((item) => item instanceof Group && item.getGroupType() === GroupType.VIEW)
            .length > 0;
    const adjustedLayerActions = hasView ? LAYER_ACTIONS : INITIAL_LAYER_ACTIONS;

    return (
        <LayerManagerComponent
            layerManager={props.layerManager}
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
            layerActions={adjustedLayerActions}
            onLayerAction={handleLayerAction}
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

const INITIAL_LAYER_ACTIONS: LayersActionGroup[] = [
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

const LAYER_ACTIONS: LayersActionGroup[] = [
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
    {
        label: "Layers",
        children: [
            {
                label: "Surfaces",
                children: [
                    {
                        identifier: "observed-surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Observed Surface",
                    },
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
                label: "Others",
                children: [
                    {
                        identifier: "realization-grid",
                        icon: <Icon data={grid_layer} fontSize="small" />,
                        label: "Realization Grid",
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
