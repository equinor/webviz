import { Icon } from "@equinor/eds-core-react";
import { color_palette, grid_layer, settings, surface_layer, timeline, wellbore } from "@equinor/eds-icons";
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
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Menu } from "@lib/components/Menu";
import { MenuButton } from "@lib/components/MenuButton";
import { MenuHeading } from "@lib/components/MenuHeading";
import { MenuItem } from "@lib/components/MenuItem";
import type { ActionGroup } from "@modules/_shared/DataProviderFramework/Actions";
import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import type { GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerComponent } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManagerComponent";
import { Group } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
import { SettingsGroup } from "@modules/_shared/DataProviderFramework/framework/SettingsGroup/SettingsGroup";
import { SharedSetting } from "@modules/_shared/DataProviderFramework/framework/SharedSetting/SharedSetting";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type { Item, ItemGroup } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entities";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { usePublishSubscribeTopicValue } from "@modules/_shared/utils/PublishSubscribeDelegate";
import { CustomDataProviderType } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { PreferredViewLayout } from "@modules/Intersection/typesAndEnums";

import { preferredViewLayoutAtom } from "../atoms/baseAtoms";

export type DataProviderManagerWrapperProps = {
    dataProviderManager: DataProviderManager;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function DataProviderManagerWrapper(props: DataProviderManagerWrapperProps) {
    const colorSet = props.workbenchSettings.useColorSet();

    const [preferredViewLayout, setPreferredViewLayout] = useAtom(preferredViewLayoutAtom);

    const groupDelegate = props.dataProviderManager.getGroupDelegate();
    usePublishSubscribeTopicValue(groupDelegate, GroupDelegateTopic.CHILDREN);

    function handleAction(identifier: string, groupDelegate: GroupDelegate) {
        switch (identifier) {
            case "intersection-view": {
                const hasIntersectionView =
                    groupDelegate.getDescendantItems(
                        (item) => item instanceof Group && item.getGroupType() === GroupType.INTERSECTION_VIEW,
                    ).length > 0;
                if (!hasIntersectionView) {
                    groupDelegate.appendChild(
                        GroupRegistry.makeGroup(
                            GroupType.INTERSECTION_VIEW,
                            props.dataProviderManager,
                            colorSet.getNextColor(),
                        ),
                    );
                }
                return;
            }
            case "settings-group":
                groupDelegate.prependChild(new SettingsGroup("Settings group", props.dataProviderManager));
                return;
            case "color-scale":
                groupDelegate.appendChild(new SharedSetting(Setting.COLOR_SCALE, null, props.dataProviderManager));
                return;
            case "realization-surfaces":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        CustomDataProviderType.REALIZATION_SURFACES,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "surfaces-realizations-uncertainty":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        CustomDataProviderType.SURFACES_REALIZATIONS_UNCERTAINTY,
                        props.dataProviderManager,
                        "Surfaces Realizations Uncertainty",
                    ),
                );
                return;
            case "wellbore-picks":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        CustomDataProviderType.ENSEMBLE_WELLBORE_PICKS,
                        props.dataProviderManager,
                    ),
                );
                return;
            case "realization-simulated-seismic":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.INTERSECTION_REALIZATION_SIMULATED_SEISMIC,
                        props.dataProviderManager,
                        "Realization Simulated Seismic",
                    ),
                );
                return;
            case "realization-observed-seismic":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.INTERSECTION_REALIZATION_OBSERVED_SEISMIC,
                        props.dataProviderManager,
                        "Realization Observed Seismic",
                    ),
                );
                return;
            case "realization-grid":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.INTERSECTION_WITH_WELLBORE_EXTENSION_REALIZATION_GRID,
                        props.dataProviderManager,
                        "Realization Grid",
                    ),
                );
                return;
            case "ensemble":
                groupDelegate.appendChild(new SharedSetting(Setting.ENSEMBLE, null, props.dataProviderManager));
                return;
            case "realization":
                groupDelegate.appendChild(new SharedSetting(Setting.REALIZATION, null, props.dataProviderManager));
                return;
            case "attribute":
                groupDelegate.appendChild(new SharedSetting(Setting.ATTRIBUTE, null, props.dataProviderManager));
                return;
            case "date":
                groupDelegate.appendChild(new SharedSetting(Setting.TIME_OR_INTERVAL, null, props.dataProviderManager));
                return;
        }
    }

    function checkIfItemMoveIsAllowed(_: Item, destinationItem: ItemGroup): boolean {
        if (destinationItem instanceof SettingsGroup || destinationItem instanceof Group) {
            return true;
        }

        return false;
    }

    function makeActionsForGroup(group: ItemGroup): ActionGroup[] {
        const hasIntersectionView =
            groupDelegate.getDescendantItems(
                (item) => item instanceof Group && item.getGroupType() === GroupType.INTERSECTION_VIEW,
            ).length > 0;

        if (!hasIntersectionView) {
            return INITIAL_ACTIONS;
        }

        if (
            group instanceof SettingsGroup ||
            (group instanceof Group && group.getGroupType() === GroupType.INTERSECTION_VIEW)
        ) {
            return ACTIONS;
        }

        return [];
    }

    return (
        <DataProviderManagerComponent
            title={"Views"}
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
            onAction={handleAction}
            isMoveAllowed={checkIfItemMoveIsAllowed}
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
                identifier: "intersection-view",
                icon: <Panorama fontSize="small" />,
                label: "Intersection View",
            },
        ],
    },
];

const ACTIONS: ActionGroup[] = [
    {
        label: "Groups",
        children: [
            {
                identifier: "settings-group",
                icon: <SettingsApplications fontSize="small" />,
                label: "Settings group",
            },
        ],
    },
    {
        label: "Intersections",
        children: [
            {
                label: "Seismic",
                children: [
                    {
                        identifier: "realization-simulated-seismic",
                        icon: <Icon data={timeline} fontSize="small" />,
                        label: "Realization Simulated Seismic",
                    },
                    {
                        identifier: "realization-observed-seismic",
                        icon: <Icon data={timeline} fontSize="small" />,
                        label: "Realization Observed Seismic",
                    },
                ],
            },
            {
                label: "Grid",
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
                        identifier: "realization-surfaces",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Realization Surfaces",
                    },
                    {
                        identifier: "surfaces-realizations-uncertainty",
                        icon: <Icon data={surface_layer} fontSize="small" />,
                        label: "Surfaces Realizations Uncertainty",
                    },
                ],
            },
            {
                label: "Wells",
                children: [
                    {
                        identifier: "wellbore-picks",
                        icon: <Icon data={wellbore} fontSize="small" />,
                        label: "Wellbore Picks",
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
                identifier: "date",
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
