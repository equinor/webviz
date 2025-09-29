import type React from "react";

import { Icon } from "@equinor/eds-core-react";
import { color_palette, fault, grid_layer, settings, surface_layer, timeline, wellbore } from "@equinor/eds-icons";
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
import { CustomDataProviderType } from "@modules/3DViewer/DataProviderFramework/customDataProviderTypes";
import { PreferredViewLayout } from "@modules/3DViewer/types";
import type { ActionGroup } from "@modules/_shared/DataProviderFramework/Actions";
import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import { RealizationSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/RealizationSurfaceProvider";
import { StatisticalSurfaceProvider } from "@modules/_shared/DataProviderFramework/dataProviders/implementations/StatisticalSurfaceProvider";
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
            case "color-scale":
                groupDelegate.prependChild(new SharedSetting(Setting.COLOR_SCALE, null, props.dataProviderManager));
                return;
            case "realization-surface":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.REALIZATION_SURFACE_3D,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "realization-polygons":
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
                        CustomDataProviderType.REALIZATION_GRID_3D,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "realization-seismic-slices":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        CustomDataProviderType.REALIZATION_SEISMIC_SLICES,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "simulated-seismic-fence":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.INTERSECTION_REALIZATION_SIMULATED_SEISMIC,
                        props.dataProviderManager,
                        "Seismic fence (simulated)",
                    ),
                );
                return;
            case "observed-seismic-fence":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.INTERSECTION_REALIZATION_OBSERVED_SEISMIC,
                        props.dataProviderManager,
                        "Seismic fence (observed)",
                    ),
                );
                return;
            case "intersection-realization-grid":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID,
                        props.dataProviderManager,
                        "Intersection Grid",
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
            case "attribute":
                groupDelegate.appendChild(new SharedSetting(Setting.ATTRIBUTE, null, props.dataProviderManager));
                return;
            case "Date":
                groupDelegate.appendChild(new SharedSetting(Setting.TIME_OR_INTERVAL, null, props.dataProviderManager));
                return;
        }
    }

    function checkIfItemMoveAllowed(movedItem: Item, destinationItem: ItemGroup): boolean {
        if (destinationItem instanceof DeltaSurface) {
            if (
                movedItem instanceof DataProvider &&
                !(movedItem instanceof RealizationSurfaceProvider || movedItem instanceof StatisticalSurfaceProvider)
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
                label: "Surfaces",
                children: [
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
                label: "Intersection",
                children: [
                    {
                        identifier: "intersection-realization-grid",
                        icon: <Icon data={grid_layer} fontSize="small" />,
                        label: "Intersection Realization Grid",
                    },
                    {
                        identifier: "simulated-seismic-fence",
                        icon: <Icon data={timeline} fontSize="small" />,
                        label: "Seismic Fence (Simulated)",
                    },
                    {
                        identifier: "observed-seismic-fence",
                        icon: <Icon data={timeline} fontSize="small" />,
                        label: "Seismic Fence (Observed)",
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
                        identifier: "realization-seismic-slices",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Realization Seismic Slices",
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
            {
                identifier: "color-scale",
                icon: <Icon data={color_palette} fontSize="small" />,
                label: "Color scale",
            },
        ],
    },
];
