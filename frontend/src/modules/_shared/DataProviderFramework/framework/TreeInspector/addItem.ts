import type { MenuItem } from "@lib/components/Menu/compositions/types";

import type { Action, ActionGroup } from "../../Actions";
import type { GroupDelegate } from "../../delegates/GroupDelegate";
import type { ItemGroup } from "../../interfacesAndTypes/entities";

import { clampInsertIndex } from "./moveRules";
import type { InsertTarget } from "./treeModel";

export type GroupActions = ActionGroup[] | ((group: ItemGroup) => ActionGroup[]);
export type OnAction = (identifier: string, groupDelegate: GroupDelegate) => void;

function isActionGroup(entry: Action | ActionGroup): entry is ActionGroup {
    return (entry as ActionGroup).children !== undefined;
}

function makeMenuItem(entry: Action | ActionGroup): MenuItem {
    if (isActionGroup(entry)) {
        return {
            id: entry.label,
            label: entry.label,
            icon: entry.icon,
            items: entry.children.map(makeMenuItem),
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

export function makeAddMenuItems(groupActions: GroupActions, group: ItemGroup): MenuItem[] {
    const actionGroups = typeof groupActions === "function" ? groupActions(group) : groupActions;
    const entries = actionGroups.length === 1 ? actionGroups[0].children : actionGroups;
    return entries.map(makeMenuItem);
}

/*
 * Runs the module's own action handler, which decides where the new item is inserted (usually prepended), and then moves
 * whatever it added to the target group to the position of the clicked add row.
 */
export function runAddAction(identifier: string, target: InsertTarget, onAction: OnAction): void {
    const groupDelegate = target.group.getGroupDelegate();
    const childrenBefore = new Set(groupDelegate.getChildren());
    const numBeforeTarget = groupDelegate.getChildren().slice(0, target.index).length;

    onAction(identifier, groupDelegate);

    const addedItems = groupDelegate.getChildren().filter((child) => !childrenBefore.has(child));
    addedItems.forEach((item, offset) => {
        groupDelegate.moveChild(item, clampInsertIndex(item, target.group, numBeforeTarget + offset));
    });
    target.group.getItemDelegate().setExpanded(true);
}
