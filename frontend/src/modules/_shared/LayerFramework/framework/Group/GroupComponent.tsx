import React from "react";

import { ColorSelect } from "@lib/components/ColorSelect";
import { SortableListGroup } from "@lib/components/SortableList";

import type { Group } from "./Group";

import { usePublishSubscribeTopicValue } from "../../../utils/PublishSubscribeDelegate";
import type { ActionGroup } from "../../Actions";
import { Actions } from "../../Actions";
import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingComponent } from "../SettingManager/SettingManagerComponent";
import { EditName } from "../utilityComponents/EditName";
import { EmptyContent } from "../utilityComponents/EmptyContent";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

export type GroupComponentProps = {
    group: Group<any, any>;
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[];
    onActionClick?: (actionIdentifier: string, group: ItemGroup) => void;
};

export function GroupComponent(props: GroupComponentProps): React.ReactNode {
    const { makeActionsForGroup } = props;

    const children = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupDelegateTopic.CHILDREN);
    const isExpanded = usePublishSubscribeTopicValue(props.group.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const color = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupDelegateTopic.COLOR);

    const actions = React.useMemo(() => {
        return makeActionsForGroup(props.group);
    }, [props.group, makeActionsForGroup]);

    function handleActionClick(actionIdentifier: string) {
        if (props.onActionClick) {
            props.onActionClick(actionIdentifier, props.group);
        }
    }

    function makeSetting(setting: SettingManager<any>) {
        const manager = props.group.getItemDelegate().getLayerManager();
        if (!manager) {
            return null;
        }
        return <SettingComponent key={setting.getId()} setting={setting} manager={manager} sharedSetting={false} />;
    }

    function makeSettings(settings: SettingManager<any>[]): React.ReactNode[] {
        const settingNodes: React.ReactNode[] = [];
        for (const setting of settings) {
            settingNodes.push(makeSetting(setting));
        }
        return settingNodes;
    }

    function makeEndAdornment() {
        const adornments: React.ReactNode[] = [];
        adornments.push(
            <Actions key="layers-actions" layersActionGroups={actions} onActionClick={handleActionClick} />,
        );
        adornments.push(<ExpandCollapseAllButton key="expand-collapse" group={props.group} />);
        adornments.push(<RemoveItemButton key="remove" item={props.group} />);
        return adornments;
    }

    function handleColorChange(color: string) {
        props.group.getGroupDelegate().setColor(color);
    }

    const emptyContentMessage = props.group.getEmptyContentMessage?.() ?? "Drag an item inside to add it.";

    return (
        <SortableListGroup
            key={props.group.getItemDelegate().getId()}
            id={props.group.getItemDelegate().getId()}
            title={
                <div className="flex gap-1 items-center relative min-w-0">
                    {color && <ColorSelect onChange={handleColorChange} value={color} dense />}
                    <div className="grow min-w-0">
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
            contentWhenEmpty={<EmptyContent>{emptyContentMessage}</EmptyContent>}
            content={
                props.group.getSharedSettingsDelegate() ? (
                    <div className="!bg-slate-100 border text-xs gap-2 grid grid-cols-[auto_1fr] items-center">
                        {makeSettings(Object.values(props.group.getWrappedSettings()))}
                    </div>
                ) : undefined
            }
        >
            {children.map((child: Item) =>
                makeSortableListItemComponent(child, props.makeActionsForGroup, props.onActionClick),
            )}
        </SortableListGroup>
    );
}
