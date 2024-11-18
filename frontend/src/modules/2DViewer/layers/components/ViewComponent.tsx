import { SortableListGroup } from "@lib/components/SortableList";

import { EditName } from "./EditName";
import { EmptyContent } from "./EmptyContent";
import { ExpandCollapseAllButton } from "./ExpandCollapseAllButton";
import { LayersActionGroup, LayersActions } from "./LayersActions";
import { RemoveButton } from "./RemoveButton";
import { VisibilityToggle } from "./VisibilityToggle";
import { makeComponent } from "./utils";

import { GroupDelegateTopic } from "../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../delegates/ItemDelegate";
import { usePublishSubscribeTopicValue } from "../delegates/PublishSubscribeDelegate";
import { Group, Item } from "../interfaces";

export type ViewComponentProps = {
    group: Group;
    actions?: LayersActionGroup[];
    onActionClick?: (actionIdentifier: string, group: Group) => void;
};

export function ViewComponent(props: ViewComponentProps): React.ReactNode {
    const children = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupDelegateTopic.CHILDREN);
    const isExpanded = usePublishSubscribeTopicValue(props.group.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const color = props.group.getGroupDelegate().getColor();

    function handleActionClick(actionIdentifier: string) {
        if (props.onActionClick) {
            props.onActionClick(actionIdentifier, props.group);
        }
    }

    function makeEndAdornment() {
        const adornments: React.ReactNode[] = [];
        if (props.actions) {
            adornments.push(
                <LayersActions
                    key="layers-actions"
                    layersActionGroups={props.actions}
                    onActionClick={handleActionClick}
                />
            );
        }
        adornments.push(<ExpandCollapseAllButton key="expand-collapse" group={props.group} />);
        adornments.push(<RemoveButton key="remove" item={props.group} />);
        return adornments;
    }

    return (
        <SortableListGroup
            key={props.group.getItemDelegate().getId()}
            id={props.group.getItemDelegate().getId()}
            title={
                <div className="flex gap-1 items-center relative min-w-0">
                    <div
                        className="w-2 h-5"
                        style={{
                            backgroundColor: color ?? undefined,
                        }}
                    />
                    <div className="flex-grow min-w-0">
                        <EditName item={props.group} />
                    </div>
                </div>
            }
            contentStyle={{
                backgroundColor: color ?? undefined,
            }}
            expanded={isExpanded}
            startAdornment={<VisibilityToggle item={props.group} />}
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={<EmptyContent>Drag a layer inside to add it to this view.</EmptyContent>}
        >
            {children.map((child: Item) => makeComponent(child, props.actions, props.onActionClick))}
        </SortableListGroup>
    );
}
