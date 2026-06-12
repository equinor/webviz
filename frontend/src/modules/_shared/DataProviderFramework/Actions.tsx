import React from "react";

import { Add, ArrowDropDown } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";
import { MenuCompositions } from "@lib/newComponents/Menu/compositions";
import type { MenuItem } from "@lib/newComponents/Menu/compositions/types";

export type Action = {
    identifier: string;
    icon?: React.ReactNode;
    label: string;
    description?: string;
    disabled?: boolean;
    /** Shown as a native tooltip when the action is disabled. */
    disabledReason?: string;
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
        disabled: entry.disabled,
        tooltip: entry.disabledReason,
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
        <MenuCompositions.Default
            side="right"
            align="start"
            open={isOpen}
            items={menuItems}
            onOpenChange={setIsOpen}
            onActionClicked={props.onActionClick}
        >
            <Button size="small" variant="ghost" tone="neutral" compact>
                <Add fontSize="inherit" />
                <span>Add</span>
                <ArrowDropDown fontSize="inherit" />
            </Button>
        </MenuCompositions.Default>
    );
}
