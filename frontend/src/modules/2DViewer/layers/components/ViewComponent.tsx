import { SortableListGroup } from "@lib/components/SortableList";

import { EditName } from "./EditName";
import { EmptyContent } from "./EmptyContent";
import { LayersActionGroup, LayersActions } from "./LayersActions";
import { RemoveButton } from "./RemoveButton";
import { VisibilityToggle } from "./VisibilityToggle";
import { makeComponent } from "./utils";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { GroupBaseTopic } from "../delegates/GroupDelegate";
import { Group, Item } from "../interfaces";

export type ViewComponentProps = {
    group: Group;
    actions?: LayersActionGroup[];
    onActionClick?: (actionIdentifier: string, group: Group) => void;
};

export function ViewComponent(props: ViewComponentProps): React.ReactNode {
    const children = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupBaseTopic.CHILDREN);
    const color = props.group.getGroupDelegate().getColor();

    function handleActionClick(actionIdentifier: string) {
        if (props.onActionClick) {
            props.onActionClick(actionIdentifier, props.group);
        }
    }

    function makeEndAdornment() {
        const adorment: React.ReactNode[] = [];
        if (props.actions) {
            adorment.push(<LayersActions layersActionGroups={props.actions} onActionClick={handleActionClick} />);
        }
        adorment.push(<RemoveButton item={props.group} />);
        return adorment;
    }

    return (
        <SortableListGroup
            key={props.group.getItemDelegate().getId()}
            id={props.group.getItemDelegate().getId()}
            title={
                <div className="flex gap-2 items-center relative">
                    <div
                        className="w-2 h-5"
                        style={{
                            backgroundColor: color ?? undefined,
                        }}
                    />
                    <EditName item={props.group} />
                </div>
            }
            contentStyle={{
                backgroundColor: color ?? undefined,
            }}
            startAdornment={<VisibilityToggle item={props.group} />}
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={<EmptyContent>Drag a layer inside to add it to this group.</EmptyContent>}
        >
            {children.map((child: Item) => makeComponent(child, props.actions, props.onActionClick))}
        </SortableListGroup>
    );
}
