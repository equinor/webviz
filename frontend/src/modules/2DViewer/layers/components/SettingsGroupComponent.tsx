import { SortableListGroup } from "@lib/components/SortableList";
import { SettingsApplications } from "@mui/icons-material";

import { EmptyContent } from "./EmptyContent";
import { ExpandCollapseAllButton } from "./ExpandCollapseAllButton";
import { LayersActionGroup, LayersActions } from "./LayersActions";
import { RemoveButton } from "./RemoveButton";
import { makeComponent } from "./utils";

import { GroupDelegateTopic } from "../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../delegates/ItemDelegate";
import { usePublishSubscribeTopicValue } from "../delegates/PublishSubscribeDelegate";
import { Group, Item } from "../interfaces";

export type SettingsGroupComponentProps = {
    group: Group;
    actions?: LayersActionGroup[];
    onActionClick?: (actionIdentifier: string, group: Group) => void;
};

export function SettingsGroupComponent(props: SettingsGroupComponentProps): React.ReactNode {
    const children = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupDelegateTopic.CHILDREN);
    const isExpanded = usePublishSubscribeTopicValue(props.group.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const color = props.group.getGroupDelegate().getColor();

    function handleActionClick(actionIdentifier: string) {
        if (props.onActionClick) {
            props.onActionClick(actionIdentifier, props.group);
        }
    }

    function makeEndAdornment() {
        const adornment: React.ReactNode[] = [];
        if (props.actions) {
            adornment.push(<LayersActions layersActionGroups={props.actions} onActionClick={handleActionClick} />);
        }
        adornment.push(<ExpandCollapseAllButton group={props.group} />);
        adornment.push(<RemoveButton item={props.group} />);
        return adornment;
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
                <EmptyContent>Drag a layer or setting inside to add it to this settings group.</EmptyContent>
            }
            expanded={isExpanded}
        >
            {children.map((child: Item) => makeComponent(child, props.actions, props.onActionClick))}
        </SortableListGroup>
    );
}
