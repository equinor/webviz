import React from "react";

import { SortableListGroup } from "@lib/components/SortableList";
import { SettingsApplications } from "@mui/icons-material";

import { usePublishSubscribeTopicValue } from "../../../utils/PublishSubscribeDelegate";
import type { ActionGroup } from "../../Actions";
import { Actions } from "../../Actions";
import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { EmptyContent } from "../utilityComponents/EmptyContent";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

export type SettingsGroupComponentProps = {
    group: ItemGroup;
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[];
    onActionClick?: (actionIdentifier: string, group: ItemGroup) => void;
};

export function SettingsGroupComponent(props: SettingsGroupComponentProps): React.ReactNode {
    const { makeActionsForGroup } = props;

    const children = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupDelegateTopic.CHILDREN);
    const isExpanded = usePublishSubscribeTopicValue(props.group.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const color = props.group.getGroupDelegate().getColor();

    const actions = React.useMemo(() => {
        return makeActionsForGroup(props.group);
    }, [props.group, makeActionsForGroup]);

    function handleActionClick(actionIdentifier: string) {
        if (props.onActionClick) {
            props.onActionClick(actionIdentifier, props.group);
        }
    }

    function makeEndAdornment() {
        const adornment: React.ReactNode[] = [];
        adornment.push(<Actions key="actions" actionGroups={actions} onActionClick={handleActionClick} />);
        adornment.push(<ExpandCollapseAllButton key="expand-collapse" group={props.group} />);
        adornment.push(<RemoveItemButton key="remove" item={props.group} />);
        return adornment;
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
            contentWhenEmpty={<EmptyContent>Drag an item inside to add it to this settings group.</EmptyContent>}
            expanded={isExpanded}
        >
            {children.map((child: Item) =>
                makeSortableListItemComponent(child, props.makeActionsForGroup, props.onActionClick),
            )}
        </SortableListGroup>
    );
}
