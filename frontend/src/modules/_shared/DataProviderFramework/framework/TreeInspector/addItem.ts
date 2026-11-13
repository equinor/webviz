import React from "react";

import { Add, Folder } from "@mui/icons-material";

import type { MenuItem } from "@lib/components/Menu/compositions/types";

import type { Action, ActionGroup } from "../../Actions";
import type { GroupDelegate } from "../../delegates/GroupDelegate";
import type { ItemGroup } from "../../interfacesAndTypes/entities";
import { isContextBoundary } from "../ContextBoundary/ContextBoundary";

import { clampInsertIndex } from "./moveRules";
import type { InsertTarget } from "./treeModel";
import { SectionId, isViewOrInsideView } from "./treeModel";

export type GroupActions = ActionGroup[] | ((group: ItemGroup) => ActionGroup[]);
export type OnAction = (identifier: string, groupDelegate: GroupDelegate) => void;

/*
 * Actions don't declare what they create, so they are classified by the conventions all modules follow: views and
 * context boundaries are added by the "view" and "context-boundary" actions, shared settings by the actions in a "Shared
 * Settings" group.
 */
const VIEW_ACTION_IDENTIFIER = "view";
const CONTEXT_BOUNDARY_ACTION_IDENTIFIER = "context-boundary";
const SHARED_SETTINGS_GROUP_LABEL_PATTERN = /shared settings?/i;

type KeepAction = (action: Action, isSharedSettingAction: boolean) => boolean;

function makeKeepAction(target: InsertTarget): KeepAction {
    switch (target.sectionId) {
        case SectionId.GLOBAL:
            return (_action, isSharedSettingAction) => isSharedSettingAction;
        case SectionId.VIEWS:
            return (action) =>
                action.identifier === VIEW_ACTION_IDENTIFIER ||
                action.identifier === CONTEXT_BOUNDARY_ACTION_IDENTIFIER;
        case SectionId.ON_TOP:
        case SectionId.BENEATH:
            return (action, isSharedSettingAction) =>
                !isSharedSettingAction && action.identifier !== VIEW_ACTION_IDENTIFIER;
        default: {
            // Inside containers - views can also live in context boundaries, as long as they aren't nested in a view
            const allowsViews = isContextBoundary(target.group) && !isViewOrInsideView(target.group);
            return (action) => allowsViews || action.identifier !== VIEW_ACTION_IDENTIFIER;
        }
    }
}

/** Keeps the actions that pass, dropping groups that end up empty. */
function filterEntries(
    entries: (Action | ActionGroup)[],
    keepAction: KeepAction,
    isInsideSharedSettingsGroup = false,
): (Action | ActionGroup)[] {
    const result: (Action | ActionGroup)[] = [];
    for (const entry of entries) {
        if (isActionGroup(entry)) {
            const isSharedSettingsGroup =
                isInsideSharedSettingsGroup || SHARED_SETTINGS_GROUP_LABEL_PATTERN.test(entry.label);
            const children = filterEntries(entry.children, keepAction, isSharedSettingsGroup);
            if (children.length > 0) {
                result.push({ ...entry, children });
            }
        } else if (keepAction(entry, isInsideSharedSettingsGroup)) {
            result.push(entry);
        }
    }
    return result;
}

function isActionGroup(entry: Action | ActionGroup): entry is ActionGroup {
    return (entry as ActionGroup).children !== undefined;
}

// Every menu entry gets an icon - modules don't always set one, e.g. on groups of actions
function makeMenuItem(entry: Action | ActionGroup): MenuItem {
    if (isActionGroup(entry)) {
        return {
            id: entry.label,
            label: entry.label,
            icon: entry.icon ?? React.createElement(Folder, { fontSize: "inherit" }),
            items: entry.children.map(makeMenuItem),
        };
    }
    return {
        id: entry.identifier,
        label: entry.label,
        icon: entry.icon ?? React.createElement(Add, { fontSize: "inherit" }),
        description: entry.description,
        disabled: entry.disabled,
        tooltip: entry.disabledReason,
    };
}

/** The module's add actions for the target's group, reduced to those that create items allowed at the target. */
export function makeAddMenuItems(groupActions: GroupActions, target: InsertTarget): MenuItem[] {
    const actionGroups = typeof groupActions === "function" ? groupActions(target.group) : groupActions;
    const filtered = filterEntries(actionGroups, makeKeepAction(target));
    const [onlyEntry] = filtered;
    const entries = filtered.length === 1 && isActionGroup(onlyEntry) ? onlyEntry.children : filtered;
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
