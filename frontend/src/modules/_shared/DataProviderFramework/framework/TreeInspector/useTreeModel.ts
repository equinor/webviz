import React from "react";

import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { DataProviderManagerTopic } from "../DataProviderManager/DataProviderManager";
import type { DataProviderManager } from "../DataProviderManager/DataProviderManager";
import { SettingTopic } from "../SettingManager/SettingManager";

import type { RailLayout, Relations, TreeRow } from "./treeModel";
import { RailColorAllocator, computeRelations, flattenTree, getItemSettings, layoutRails } from "./treeModel";

/** A counter that changes whenever the tree structure, names, visibility or expansion states change. */
function useTreeRevision(manager: DataProviderManager): number {
    const [revision, increment] = React.useReducer((value: number) => value + 1, 0);

    React.useEffect(
        function subscribeToTreeChanges() {
            const managerDelegate = manager.getPublishSubscribeDelegate();
            const groupDelegate = manager.getGroupDelegate().getPublishSubscribeDelegate();
            const unsubscribers = [
                managerDelegate.subscribe(DataProviderManagerTopic.GUI_STATE_REVISION, increment),
                managerDelegate.subscribe(DataProviderManagerTopic.ITEMS, increment),
                // Expansion states are published as a new object on every read, so they can't be used as a snapshot
                groupDelegate.subscribe(GroupDelegateTopic.CHILDREN_EXPANSION_STATES, increment),
            ];
            return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
        },
        [manager],
    );

    return revision;
}

/** A counter that changes whenever any setting in the tree gets or loses its external controller. */
function useBindingRevision(manager: DataProviderManager, treeRevision: number): number {
    const [revision, increment] = React.useReducer((value: number) => value + 1, 0);

    React.useEffect(
        function subscribeToBindingChanges() {
            const unsubscribers: (() => void)[] = [];
            for (const item of manager.getGroupDelegate().getDescendantItems(() => true)) {
                for (const setting of getItemSettings(item)) {
                    unsubscribers.push(
                        setting
                            .getPublishSubscribeDelegate()
                            .subscribe(SettingTopic.IS_EXTERNALLY_CONTROLLED, increment),
                    );
                }
            }
            // Bindings may have changed together with the tree
            increment();
            return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
        },
        [manager, treeRevision],
    );

    return revision;
}

export type TreeModel = {
    rows: TreeRow[];
    relations: Relations;
    railLayout: RailLayout;
};

export function useTreeModel(manager: DataProviderManager): TreeModel {
    const treeRevision = useTreeRevision(manager);
    const bindingRevision = useBindingRevision(manager, treeRevision);
    // Kept for the lifetime of the tree inspector, so sources keep their colours
    const [colorAllocator] = React.useState(() => new RailColorAllocator());

    // The revisions are the actual dependencies - the manager is mutable
    // eslint-disable-next-line @eslint-react/exhaustive-deps
    const rows = React.useMemo(() => flattenTree(manager), [manager, treeRevision]);
    const relations = React.useMemo(
        () => computeRelations(manager, colorAllocator),
        // eslint-disable-next-line @eslint-react/exhaustive-deps
        [manager, colorAllocator, treeRevision, bindingRevision],
    );
    const railLayout = React.useMemo(() => layoutRails(rows, relations), [rows, relations]);

    return { rows, relations, railLayout };
}
