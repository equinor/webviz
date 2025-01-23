import React from "react";

import { Icon } from "@equinor/eds-core-react";
import { color_palette, grid_layer, settings, surface_layer, wellbore } from "@equinor/eds-icons";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Menu } from "@lib/components/Menu";
import { MenuButton } from "@lib/components/MenuButton";
import { MenuHeading } from "@lib/components/MenuHeading";
import { MenuItem } from "@lib/components/MenuItem";
import { ObservedSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/ObservedSurfaceLayer";
import { StatisticalSurfaceLayer } from "@modules/2DViewer/LayerFramework/customLayerImplementations/StatisticalSurfaceLayer";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { EnsembleSetting } from "@modules//_shared/LayerFramework/settings/implementations/EnsembleSetting";
import { LayersActionGroup } from "@modules/_shared/LayerFramework/LayersActions";
import { GroupDelegate, GroupDelegateTopic } from "@modules/_shared/LayerFramework/delegates/GroupDelegate";
import { usePublishSubscribeTopicValue } from "@modules/_shared/LayerFramework/delegates/PublishSubscribeDelegate";
import { ColorScale } from "@modules/_shared/LayerFramework/framework/ColorScale/ColorScale";
import { DeltaSurface } from "@modules/_shared/LayerFramework/framework/DeltaSurface/DeltaSurface";
import { LayerManager } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { LayerManagerComponent } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManagerComponent";
import { SettingsGroup } from "@modules/_shared/LayerFramework/framework/SettingsGroup/SettingsGroup";
import { SharedSetting } from "@modules/_shared/LayerFramework/framework/SharedSetting/SharedSetting";
import { View } from "@modules/_shared/LayerFramework/framework/View/View";
import { Group, Item, instanceofGroup, instanceofLayer } from "@modules/_shared/LayerFramework/interfaces";
import { DrilledWellTrajectoriesLayer } from "@modules/_shared/LayerFramework/layers/implementations/DrilledWellTrajectoriesLayer";
import { RealizationSetting } from "@modules/_shared/LayerFramework/settings/implementations/RealizationSetting";
import { TimeOrIntervalSetting } from "@modules/_shared/LayerFramework/settings/implementations/TimeOrIntervalSetting";
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

import { RealizationGridLayer } from "../../LayerFramework/customLayerImplementations/RealizationGridLayer";
import { RealizationSurfaceLayer } from "../../LayerFramework/customLayerImplementations/RealizationSurfaceLayer";
import { preferredViewLayoutAtom } from "../atoms/baseAtoms";

export type LayerManagerComponentWrapperProps = {
    layerManager: LayerManager;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function LayerManagerComponentWrapper(props: LayerManagerComponentWrapperProps): React.ReactNode {
    const colorSet = props.workbenchSettings.useColorSet();
    const [preferredViewLayout, setPreferredViewLayout] = useAtom(preferredViewLayoutAtom);

    const groupDelegate = props.layerManager.getGroupDelegate();
    usePublishSubscribeTopicValue(groupDelegate, GroupDelegateTopic.CHILDREN);

    function handleLayerAction(identifier: string, groupDelegate: GroupDelegate) {
        const numSharedSettings = groupDelegate.findChildren((item) => {
            return item instanceof SharedSetting;
        }).length;

        const numViews = groupDelegate.getDescendantItems((item) => item instanceof View).length;

        switch (identifier) {
            case "view":
                groupDelegate.appendChild(
                    new View(numViews > 0 ? `View (${numViews})` : "View", props.layerManager, colorSet.getNextColor())
                );
                return;
            case "delta-surface":
                groupDelegate.insertChild(new DeltaSurface("Delta surface", props.layerManager), numSharedSettings);
                return;
            case "settings-group":
                groupDelegate.insertChild(new SettingsGroup("Settings group", props.layerManager), numSharedSettings);
                return;
            case "color-scale":
                groupDelegate.prependChild(new ColorScale("Color scale", props.layerManager));
                return;
            case "realization-grid":
                groupDelegate.insertChild(new RealizationGridLayer(props.layerManager), numSharedSettings);
                return;
            case "realization-surface":
                groupDelegate.insertChild(new RealizationSurfaceLayer(props.layerManager), numSharedSettings);
                return;
            case "drilled-wellbore-trajectories":
                groupDelegate.insertChild(new DrilledWellTrajectoriesLayer(props.layerManager), numSharedSettings);
                return;
            case "ensemble":
                groupDelegate.prependChild(new SharedSetting(new EnsembleSetting(), props.layerManager));
                return;
            case "realization":
                groupDelegate.prependChild(new SharedSetting(new RealizationSetting(), props.layerManager));
                return;
            case "Date":
                groupDelegate.prependChild(new SharedSetting(new TimeOrIntervalSetting(), props.layerManager));
                return;
        }
    }

    function checkIfItemMoveAllowed(movedItem: Item, destinationItem: Group): boolean {
        if (destinationItem instanceof DeltaSurface) {
            if (
                instanceofLayer(movedItem) &&
                !(
                    movedItem instanceof RealizationSurfaceLayer ||
                    movedItem instanceof StatisticalSurfaceLayer ||
                    movedItem instanceof ObservedSurfaceLayer
                )
            ) {
                return false;
            }

            if (instanceofGroup(movedItem)) {
                return false;
            }

            if (destinationItem.getGroupDelegate().findChildren((item) => instanceofLayer(item)).length >= 2) {
                return false;
            }
        }

        return true;
    }

    const hasView = groupDelegate.getDescendantItems((item) => item instanceof View).length > 0;
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
                label: "Others",
                children: [
                    {
                        identifier: "realization-grid",
                        icon: <Icon data={grid_layer} fontSize="small" />,
                        label: "Realization Grid",
                    },
                    {
                        identifier: "realization-surface",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Realization Surface",
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
