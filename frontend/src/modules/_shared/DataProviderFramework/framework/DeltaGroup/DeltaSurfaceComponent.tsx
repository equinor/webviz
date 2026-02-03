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
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

import type { DeltaGroup } from "./DeltaGroup";

export type DeltaGroupComponentProps = {
    deltaGroup: DeltaGroup;
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[];
    onActionClick?: (actionIdentifier: string, group: ItemGroup) => void;
};

export function DeltaGroupComponent(props: DeltaGroupComponentProps): React.ReactNode {
    const { makeActionsForGroup } = props;

    const children = usePublishSubscribeTopicValue(props.deltaGroup.getGroupDelegate(), GroupDelegateTopic.CHILDREN);
    const isExpanded = usePublishSubscribeTopicValue(props.deltaGroup.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const color = props.deltaGroup.getGroupDelegate().getColor();

    const actions = React.useMemo(() => {
        return makeActionsForGroup(props.deltaGroup);
    }, [props.deltaGroup, makeActionsForGroup]);

    function handleActionClick(actionIdentifier: string) {
        if (props.onActionClick) {
            props.onActionClick(actionIdentifier, props.deltaGroup);
        }
    }

    function makeEndAdornment() {
        const adornment: React.ReactNode[] = [];
        if (props.deltaGroup.getGroupDelegate().findChildren((item) => isDataProvider(item)).length < 2) {
            adornment.push(<Actions key="actions" actionGroups={actions} onActionClick={handleActionClick} />);
        }
        adornment.push(<ExpandCollapseAllButton key="expand-collapse" group={props.deltaGroup} />);
        adornment.push(<RemoveItemButton key="remove" item={props.deltaGroup} />);
        return adornment;
    }

    return (
        <SortableListGroup
            key={props.deltaGroup.getItemDelegate().getId()}
            id={props.deltaGroup.getItemDelegate().getId()}
            title={<EditName item={props.deltaGroup} />}
            contentStyle={{
                backgroundColor: color ?? undefined,
            }}
            headerStyle={{
                backgroundColor: color ?? undefined,
            }}
            startAdornment={
                <div className="flex items-center gap-2">
                    <VisibilityToggle item={props.deltaGroup} />
                </div>
            }
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={
                <EmptyContent>
                    Drag two or more data providers of the same type inside to calculate the difference between them.
                </EmptyContent>
            }
            expanded={isExpanded}
        >
            {children.map((child: Item) =>
                makeSortableListItemComponent(child, props.makeActionsForGroup, props.onActionClick),
            )}
        </SortableListGroup>
    );
}
