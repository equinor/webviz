import { SortableListGroup } from "@lib/components/SortableList";
import { SettingsApplications } from "@mui/icons-material";

import { usePublishSubscribeTopicValue } from "../../../utils/PublishSubscribeDelegate";
import type { LayersActionGroup } from "../../LayersActions";
import { LayersActions } from "../../LayersActions";
import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { Group, Item } from "../../interfaces";
import { EmptyContent } from "../utilityComponents/EmptyContent";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

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
            adornment.push(
                <LayersActions
                    key="layers-actions"
                    layersActionGroups={props.actions}
                    onActionClick={handleActionClick}
                />,
            );
        }
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
            contentWhenEmpty={
                <EmptyContent>Drag a layer or setting inside to add it to this settings group.</EmptyContent>
            }
            expanded={isExpanded}
        >
            {children.map((child: Item) => makeSortableListItemComponent(child, props.actions, props.onActionClick))}
        </SortableListGroup>
    );
}
