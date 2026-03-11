import React from "react";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import type { ActionGroup } from "../../Actions";
import { Actions } from "../../Actions";
import { SortableListGroup } from "../../components/group";
import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { isDataProvider } from "../DataProvider/DataProvider";
import { EditName } from "../utilityComponents/EditName";
import { EmptyContent } from "../utilityComponents/EmptyContent";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { GroupErrorBadge } from "../utilityComponents/GroupErrorBadge";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

import type { DeltaSurface } from "./DeltaSurface";

export type DeltaSurfaceComponentProps = {
    deltaSurface: DeltaSurface;
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[];
    onActionClick?: (actionIdentifier: string, group: ItemGroup) => void;
};

export function DeltaSurfaceComponent(props: DeltaSurfaceComponentProps): React.ReactNode {
    const { makeActionsForGroup, onActionClick } = props;

    const children = usePublishSubscribeTopicValue(props.deltaSurface.getGroupDelegate(), GroupDelegateTopic.CHILDREN);
    const isExpanded = usePublishSubscribeTopicValue(props.deltaSurface.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const color = props.deltaSurface.getGroupDelegate().getColor();

    const actions = React.useMemo(() => {
        return makeActionsForGroup(props.deltaSurface);
    }, [props.deltaSurface, makeActionsForGroup]);

    const handleActionClick = React.useCallback(
        function handleActionClick(actionIdentifier: string) {
            onActionClick?.(actionIdentifier, props.deltaSurface);
        },
        [props.deltaSurface, onActionClick],
    );

    const handleToggleExpanded = React.useCallback(
        function handleToggleExpanded(expanded: boolean) {
            props.deltaSurface.getItemDelegate().setExpanded(expanded);
        },
        [props.deltaSurface],
    );

    function makeEndAdornment() {
        const adornments: React.ReactNode[] = [];
        adornments.push(<GroupErrorBadge key="error-badge" group={props.deltaSurface} />);
        if (props.deltaSurface.getGroupDelegate().findChildren((item) => isDataProvider(item)).length < 2) {
            adornments.push(<Actions key="actions" actionGroups={actions} onActionClick={handleActionClick} />);
        }
        adornments.push(<ExpandCollapseAllButton key="expand-collapse" group={props.deltaSurface} />);
        adornments.push(<RemoveItemButton key="remove" item={props.deltaSurface} />);
        return adornments;
    }

    return (
        <SortableListGroup
            key={props.deltaSurface.getItemDelegate().getId()}
            id={props.deltaSurface.getItemDelegate().getId()}
            title={<EditName item={props.deltaSurface} />}
            contentStyle={{
                backgroundColor: color ?? undefined,
            }}
            headerStyle={{
                backgroundColor: color ?? undefined,
            }}
            startAdornment={
                <div className="flex items-center gap-2">
                    <VisibilityToggle item={props.deltaSurface} />
                </div>
            }
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={
                <EmptyContent>Drag two surface layers inside to calculate the difference between them.</EmptyContent>
            }
            expanded={isExpanded}
            onToggleExpanded={handleToggleExpanded}
        >
            {children.map((child: Item) =>
                makeSortableListItemComponent(child, props.makeActionsForGroup, props.onActionClick),
            )}
        </SortableListGroup>
    );
}
