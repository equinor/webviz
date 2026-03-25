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
    GridView,
} from "@mui/icons-material";
import { useAtom } from "jotai";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import { useColorSet, type WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Menu } from "@lib/components/Menu";
import { MenuButton } from "@lib/components/MenuButton";
import { MenuHeading } from "@lib/components/MenuHeading";
import { MenuItem } from "@lib/components/MenuItem";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import type { ActionGroup } from "@modules/_shared/DataProviderFramework/Actions";
import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";
import { DataProviderType } from "@modules/_shared/DataProviderFramework/dataProviders/dataProviderTypes";
import type { GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { ContextBoundary } from "@modules/_shared/DataProviderFramework/framework/ContextBoundary/ContextBoundary";
import { DataProvider } from "@modules/_shared/DataProviderFramework/framework/DataProvider/DataProvider";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { DataProviderManagerComponent } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManagerComponent";
import { Group } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
import { SharedSetting } from "@modules/_shared/DataProviderFramework/framework/SharedSetting/SharedSetting";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import type { Item, ItemGroup } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/entities";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import { CustomDataProviderType } from "@modules/Intersection/DataProviderFramework/customDataProviderImplementations/dataProviderTypes";
import { MAX_INTERSECTION_VIEWS, PreferredViewLayout } from "@modules/Intersection/typesAndEnums";

import { preferredViewLayoutAtom } from "../atoms/baseAtoms";

export type DataProviderManagerWrapperProps = {
    dataProviderManager: DataProviderManager;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function DataProviderManagerWrapper(props: DataProviderManagerWrapperProps) {
    const colorSet = useColorSet(props.workbenchSettings);

    const [preferredViewLayout, setPreferredViewLayout] = useAtom(preferredViewLayoutAtom);

    const groupDelegate = props.dataProviderManager.getGroupDelegate();
    usePublishSubscribeTopicValue(groupDelegate, GroupDelegateTopic.CHILDREN);

    function handleAction(identifier: string, groupDelegate: GroupDelegate) {
        switch (identifier) {
            case "view": {
                const viewCount = groupDelegate.getDescendantItems(
                    (item) => item instanceof Group && item.getGroupType() === GroupType.INTERSECTION_VIEW,
                ).length;
                if (viewCount < MAX_INTERSECTION_VIEWS) {
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
            case "context-boundary":
                groupDelegate.prependChild(new ContextBoundary("Context boundary", props.dataProviderManager));
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
            case "seismic":
                groupDelegate.prependChild(
                    DataProviderRegistry.makeDataProvider(
                        DataProviderType.INTERSECTION_SEISMIC,
                        props.dataProviderManager,
                        "Seismic",
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
            case "intersection-source":
                groupDelegate.appendChild(new SharedSetting(Setting.INTERSECTION, null, props.dataProviderManager));
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

    function checkIfItemMoveIsAllowed(item: Item, destinationItem: ItemGroup): boolean {
        const itemIsView = item instanceof Group && item.getGroupType() === GroupType.INTERSECTION_VIEW;
        const destinationIsView =
            destinationItem instanceof Group && destinationItem.getGroupType() === GroupType.INTERSECTION_VIEW;

        if (itemIsView && destinationIsView) {
            return false;
        }

        const destinationIsContextBoundaryWithViewAncestor =
            destinationItem instanceof ContextBoundary &&
            destinationItem
                .getGroupDelegate()
                .getAncestors(
                    (ancestor) => ancestor instanceof Group && ancestor.getGroupType() === GroupType.INTERSECTION_VIEW,
                ).length > 0;

        if (itemIsView && destinationIsContextBoundaryWithViewAncestor) {
            return false;
        }

        // If the item is CustomDataProviderType it can only be moved to a view or a context boundary in a view
        if (item instanceof DataProvider) {
            return destinationIsView || destinationIsContextBoundaryWithViewAncestor;
        }

        return true;
    }

    function makeActionsForGroup(group: ItemGroup): ActionGroup[] {
        const numViews = groupDelegate.getDescendantItems(
            (item) => item instanceof Group && item.getGroupType() === GroupType.INTERSECTION_VIEW,
        ).length;
        const isAtMax = numViews >= MAX_INTERSECTION_VIEWS;

        if (group instanceof ContextBoundary) {
            return isAtMax ? CONTEXT_BOUNDARY_ACTIONS_AT_MAX_VIEWS : CONTEXT_BOUNDARY_ACTIONS;
        }

        if (group instanceof Group && group.getGroupType() === GroupType.INTERSECTION_VIEW) {
            return VIEW_ACTIONS;
        }

        // Root level
        return isAtMax ? ROOT_ACTIONS_AT_MAX : ROOT_ACTIONS;
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
                            checked={preferredViewLayout === PreferredViewLayout.GRID}
                            onClick={() => setPreferredViewLayout(PreferredViewLayout.GRID)}
                        >
                            <GridView fontSize="inherit" /> Grid
                        </ViewLayoutMenuItem>
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

const ADD_VIEW_ACTION = {
    identifier: "view",
    icon: <Panorama fontSize="small" />,
    label: "View",
};

const ADD_CONTEXT_BOUNDARY_ACTION = {
    identifier: "context-boundary",
    icon: <SettingsApplications fontSize="small" />,
    label: "Context Boundary",
};

const SHARED_SETTINGS_CHILDREN = [
    {
        identifier: "intersection-source",
        icon: <Icon data={settings} fontSize="small" />,
        label: "Intersection source",
    },
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
];

const SHARED_SETTINGS_ACTION_GROUP: ActionGroup = {
    label: "Shared Settings",
    children: SHARED_SETTINGS_CHILDREN,
};

// Intersection source is already a fixed view-level setting, so exclude it from view actions
const VIEW_SHARED_SETTINGS_ACTION_GROUP: ActionGroup = {
    label: "Shared Settings",
    children: SHARED_SETTINGS_CHILDREN.filter((c) => c.identifier !== "intersection-source"),
};

// Root level: View + Context Boundary
const ROOT_ACTIONS: ActionGroup[] = [
    { label: "Groups", children: [ADD_VIEW_ACTION, ADD_CONTEXT_BOUNDARY_ACTION] },
    SHARED_SETTINGS_ACTION_GROUP,
];

// Root level at max views: Context Boundary only
const ROOT_ACTIONS_AT_MAX: ActionGroup[] = [
    { label: "Groups", children: [ADD_CONTEXT_BOUNDARY_ACTION] },
    SHARED_SETTINGS_ACTION_GROUP,
];

// Context boundary: View + Shared Settings
const CONTEXT_BOUNDARY_ACTIONS: ActionGroup[] = [
    { label: "Groups", children: [ADD_VIEW_ACTION] },
    SHARED_SETTINGS_ACTION_GROUP,
];

// Context boundary at max views: Shared Settings only
const CONTEXT_BOUNDARY_ACTIONS_AT_MAX_VIEWS: ActionGroup[] = [SHARED_SETTINGS_ACTION_GROUP];

// View: Context Boundary + all data layers + Shared Settings + Utilities
const VIEW_ACTIONS: ActionGroup[] = [
    { label: "Groups", children: [ADD_CONTEXT_BOUNDARY_ACTION] },
    {
        label: "Intersections",
        children: [
            {
                label: "Seismic",
                children: [
                    {
                        identifier: "seismic",
                        icon: <Icon data={timeline} fontSize="small" />,
                        label: "Seismic",
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
    VIEW_SHARED_SETTINGS_ACTION_GROUP,
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
