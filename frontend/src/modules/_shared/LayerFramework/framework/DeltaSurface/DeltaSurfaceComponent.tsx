import { SortableListGroup } from "@lib/components/SortableList";

import { DeltaSurface } from "./DeltaSurface";

import { usePublishSubscribeTopicValue } from "../../../utils/PublishSubscribeDelegate";
import { LayersActionGroup, LayersActions } from "../../LayersActions";
import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import { Item, ItemGroup } from "../../interfacesAndTypes/entitites";
import { DataLayer } from "../DataLayer/DataLayer";
import { EditName } from "../utilityComponents/EditName";
import { EmptyContent } from "../utilityComponents/EmptyContent";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

export type DeltaSurfaceComponentProps = {
    deltaSurface: DeltaSurface;
    actions?: LayersActionGroup[];
    onActionClick?: (actionIdentifier: string, group: ItemGroup) => void;
};

export function DeltaSurfaceComponent(props: DeltaSurfaceComponentProps): React.ReactNode {
    const children = usePublishSubscribeTopicValue(props.deltaSurface.getGroupDelegate(), GroupDelegateTopic.CHILDREN);
    const isExpanded = usePublishSubscribeTopicValue(props.deltaSurface.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const color = props.deltaSurface.getGroupDelegate().getColor();

    function handleActionClick(actionIdentifier: string) {
        if (props.onActionClick) {
            props.onActionClick(actionIdentifier, props.deltaSurface);
        }
    }

    function makeEndAdornment() {
        const adornment: React.ReactNode[] = [];
        if (
            props.actions &&
            props.deltaSurface.getGroupDelegate().findChildren((item) => item instanceof DataLayer).length < 2
        ) {
            adornment.push(
                <LayersActions
                    key="layers-actions"
                    layersActionGroups={props.actions}
                    onActionClick={handleActionClick}
                />
            );
        }
        adornment.push(<ExpandCollapseAllButton key="expand-collapse" group={props.deltaSurface} />);
        adornment.push(<RemoveItemButton key="remove" item={props.deltaSurface} />);
        return adornment;
    }

    return (
        <SortableListGroup
            key={props.deltaSurface.getItemDelegate().getId()}
            id={props.deltaSurface.getItemDelegate().getId()}
            title={<EditName item={props.deltaSurface} />}
            contentStyle={{
                backgroundColor: color ?? undefined,
            }}
            headerStyle={{
                backgroundColor: color ?? undefined,
            }}
            startAdornment={
                <div className="flex items-center gap-2">
                    <VisibilityToggle item={props.deltaSurface} />
                </div>
            }
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={
                <EmptyContent>Drag two surface layers inside to calculate the difference between them.</EmptyContent>
            }
            expanded={isExpanded}
        >
            {children.map((child: Item) => makeSortableListItemComponent(child, props.actions, props.onActionClick))}
        </SortableListGroup>
    );
}
