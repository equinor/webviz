import React from "react";

import { Add, ArrowDropDown } from "@mui/icons-material";

import { Menu } from "@lib/components/Menu/";
import type { MenuItem } from "@lib/components/Menu/";

export type Action = {
    identifier: string;
    icon?: React.ReactNode;
    label: string;
    description?: string;
};

export type ActionGroup = {
    icon?: React.ReactNode;
    label: string;
    children: (Action | ActionGroup)[];
};

function recursivelyMakeMenuItem(entry: ActionGroup | Action): MenuItem {
    if (isActionGroup(entry)) {
        return {
            id: entry.label,
            label: entry.label,
            icon: entry.icon,
            items: entry.children.map(recursivelyMakeMenuItem),
        };
    }

    return {
        id: entry.identifier,
        label: entry.label,
        icon: entry.icon,
        description: entry.description,
    };
}

function isActionGroup(action: Action | ActionGroup): action is ActionGroup {
    return (action as ActionGroup).children !== undefined;
}

export type ActionsProps = {
    actionGroups: ActionGroup[];
    startOpen?: boolean;
    onActionClick: (actionIdentifier: string) => void;
};

export function Actions(props: ActionsProps): React.ReactNode {
    const [isOpen, setIsOpen] = React.useState(props.startOpen ?? false);

    const actions = props.actionGroups.length === 1 ? props.actionGroups[0].children : props.actionGroups;

    const menuItems = React.useMemo(() => actions.map(recursivelyMakeMenuItem), [actions]);

    return (
        <Menu
            open={isOpen}
            items={menuItems}
            itemSize="small"
            triggerSize="small"
            onOpenChange={setIsOpen}
            onActionClicked={props.onActionClick}
        >
            <Add fontSize="inherit" />
            <span>Add</span>
            <ArrowDropDown fontSize="inherit" />
        </Menu>
    );
}
