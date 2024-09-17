import { SortableListGroup } from "@lib/components/SortableList";
import { SettingsApplications } from "@mui/icons-material";

import { LayersActionGroup, LayersActions } from "./LayersActions";
import { RemoveButtonComponent } from "./RemoveButtonComponent";
import { makeComponent } from "./utils";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { GroupBaseTopic } from "../delegates/GroupDelegate";
import { Group, Item } from "../interfaces";

export type SettingsGroupComponentProps = {
    group: Group;
    actions?: LayersActionGroup[];
    onActionClick?: (actionIdentifier: string, group: Group) => void;
};

export function SettingsGroupComponent(props: SettingsGroupComponentProps): React.ReactNode {
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
            title={props.group.getItemDelegate().getName()}
            contentStyle={{
                backgroundColor: color ?? undefined,
            }}
            headerStyle={{
                backgroundColor: "rgb(196 181 253)",
            }}
            startAdornment={<SettingsApplications fontSize="inherit" />}
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={
                <div className="flex !bg-white h-16 justify-center text-sm items-center gap-1">
                    Drag a layer or setting inside to add it to this settings group.
                </div>
            }
        >
            {children.map((child: Item) => makeComponent(child, props.actions, props.onActionClick))}
        </SortableListGroup>
    );
}
