import React from "react";

import { SettingsApplications } from "@mui/icons-material";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import type { ActionGroup } from "../../Actions";
import { Actions } from "../../Actions";
import { SortableListGroup } from "../../components/group";
import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { EmptyContent } from "../utilityComponents/EmptyContent";
import { ErrorBadge } from "../utilityComponents/ErrorBadge";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

export type ContextBoundaryComponentProps = {
    group: ItemGroup;
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[];
    onActionClick?: (actionIdentifier: string, group: ItemGroup) => void;
};

export function ContextBoundaryComponent(props: ContextBoundaryComponentProps): React.ReactNode {
    const { makeActionsForGroup, onActionClick } = props;

    const children = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupDelegateTopic.CHILDREN);
    const isExpanded = usePublishSubscribeTopicValue(props.group.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const color = props.group.getGroupDelegate().getColor();

    const actions = React.useMemo(() => {
        return makeActionsForGroup(props.group);
    }, [props.group, makeActionsForGroup]);

    const handleActionClick = React.useCallback(
        function handleActionClick(actionIdentifier: string) {
            onActionClick?.(actionIdentifier, props.group);
        },
        [props.group, onActionClick],
    );

    const handleToggleExpanded = React.useCallback(
        function handleToggleExpanded(expanded: boolean) {
            props.group.getItemDelegate().setExpanded(expanded);
        },
        [props.group],
    );

    function makeEndAdornment() {
        const adornments: React.ReactNode[] = [];
        adornments.push(<ErrorBadge key="error-badge" group={props.group} />);
        adornments.push(<Actions key="actions" actionGroups={actions} onActionClick={handleActionClick} />);
        adornments.push(<ExpandCollapseAllButton key="expand-collapse" group={props.group} />);
        adornments.push(<RemoveItemButton key="remove" item={props.group} />);
        return adornments;
    }

    return (
        <SortableListGroup
            key={props.group.getItemDelegate().getId()}
            id={props.group.getItemDelegate().getId()}
            title={
                <div className="overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
                    {props.group.getItemDelegate().getName()}
                </div>
            }
            contentStyle={{
                backgroundColor: color ?? undefined,
            }}
            headerStyle={{
                backgroundColor: "rgb(196 181 253)",
            }}
            startAdornment={<SettingsApplications fontSize="inherit" />}
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={<EmptyContent>Drag an item inside to add it to this context boundary.</EmptyContent>}
            expanded={isExpanded}
            onToggleExpanded={handleToggleExpanded}
        >
            {children.map((child: Item) =>
                makeSortableListItemComponent(child, props.makeActionsForGroup, props.onActionClick),
            )}
        </SortableListGroup>
    );
}
