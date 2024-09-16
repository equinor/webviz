import { SortableListGroup } from "@lib/components/SortableList";

import { EditNameComponent } from "./editNameComponent";
import { LayersActionGroup, LayersActions } from "./layersActions";
import { RemoveButtonComponent } from "./removeButtonComponent";
import { makeComponent } from "./utils";
import { VisibilityToggleComponent } from "./visibilityToggleComponent";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { GroupBaseTopic } from "../delegates/GroupDelegate";
import { Group, Item } from "../interfaces";

export type GroupComponentProps = {
    group: Group;
    actions?: LayersActionGroup[];
    onActionClick?: (actionIdentifier: string, group: Group) => void;
};

export function GroupComponent(props: GroupComponentProps): React.ReactNode {
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
        adorment.push(<RemoveButtonComponent item={props.group} />);
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
                    <EditNameComponent item={props.group} />
                </div>
            }
            contentStyle={{
                backgroundColor: color ?? undefined,
            }}
            startAdornment={<VisibilityToggleComponent item={props.group} />}
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={
                <div className="flex !bg-white h-16 justify-center text-sm items-center gap-1">
                    Drag a layer inside to add it to this group.
                </div>
            }
        >
            {children.map((child: Item) => makeComponent(child))}
        </SortableListGroup>
    );
}
