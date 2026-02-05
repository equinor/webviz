import React from "react";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import type { ActionGroup } from "../../Actions";
import { Actions } from "../../Actions";
import { SortableListGroup } from "../../components/group";
import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import { Operation } from "../../interfacesAndTypes/customOperationGroupImplementation";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { isDataProvider } from "../DataProvider/DataProvider";
import { EditName } from "../utilityComponents/EditName";
import { EmptyContent } from "../utilityComponents/EmptyContent";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

import { OperationGroupTopic, type OperationGroup } from "./OperationGroup";

export type OperationGroupComponentProps = {
    operationGroup: OperationGroup<any, any, any>;
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[];
    onActionClick?: (actionIdentifier: string, group: ItemGroup) => void;
};

export function OperationGroupComponent(props: OperationGroupComponentProps): React.ReactNode {
    const { makeActionsForGroup } = props;

    const children = usePublishSubscribeTopicValue(
        props.operationGroup.getGroupDelegate(),
        GroupDelegateTopic.CHILDREN,
    );
    const isExpanded = usePublishSubscribeTopicValue(
        props.operationGroup.getItemDelegate(),
        ItemDelegateTopic.EXPANDED,
    );
    const operation = usePublishSubscribeTopicValue(props.operationGroup, OperationGroupTopic.OPERATION);

    const color = props.operationGroup.getGroupDelegate().getColor();

    const actions = React.useMemo(() => {
        return makeActionsForGroup(props.operationGroup);
    }, [props.operationGroup, makeActionsForGroup]);

    function handleActionClick(actionIdentifier: string) {
        if (props.onActionClick) {
            props.onActionClick(actionIdentifier, props.operationGroup);
        }
    }

    function makeEndAdornment() {
        const adornment: React.ReactNode[] = [];
        if (props.operationGroup.getGroupDelegate().findChildren((item) => isDataProvider(item)).length < 2) {
            adornment.push(<Actions key="actions" actionGroups={actions} onActionClick={handleActionClick} />);
        }
        adornment.push(<ExpandCollapseAllButton key="expand-collapse" group={props.operationGroup} />);
        adornment.push(<RemoveItemButton key="remove" item={props.operationGroup} />);
        return adornment;
    }

    function makePlaceholder() {
        switch (operation) {
            case Operation.DELTA:
                return "Drag two or more data providers of the same type inside to calculate the difference between them.";
            default: {
                const _exhaustiveCheck: never = operation;
                return _exhaustiveCheck;
            }
        }
    }

    return (
        <SortableListGroup
            key={props.operationGroup.getItemDelegate().getId()}
            id={props.operationGroup.getItemDelegate().getId()}
            title={<EditName item={props.operationGroup} />}
            contentStyle={{
                backgroundColor: color ?? undefined,
            }}
            headerStyle={{
                backgroundColor: color ?? undefined,
            }}
            startAdornment={
                <div className="flex items-center gap-2">
                    <VisibilityToggle item={props.operationGroup} />
                </div>
            }
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={<EmptyContent>{makePlaceholder()}</EmptyContent>}
            expanded={isExpanded}
        >
            {children.map((child: Item) =>
                makeSortableListItemComponent(child, props.makeActionsForGroup, props.onActionClick),
            )}
        </SortableListGroup>
    );
}
