import React from "react";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { SortableListItem } from "@lib/components/SortableList";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Delete, ExpandLess, ExpandMore, Link } from "@mui/icons-material";

import { SettingComponent } from "./SettingComponent";

import { SharedSetting } from "../SharedSetting";
import { ItemDelegateTopic } from "../delegates/ItemDelegate";
import { usePublishSubscribeTopicValue } from "../delegates/PublishSubscribeDelegate";

export type SharedSettingComponentProps = {
    sharedSetting: SharedSetting;
};

export function SharedSettingComponent(props: SharedSettingComponentProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.sharedSetting.getItemDelegate(), ItemDelegateTopic.EXPANDED);

    const manager = props.sharedSetting.getItemDelegate().getLayerManager();
    if (!manager) {
        return null;
    }

    function handleToggleExpanded() {
        props.sharedSetting.getItemDelegate().setIsExpanded(!isExpanded);
    }

    return (
        <SortableListItem
            key={props.sharedSetting.getItemDelegate().getId()}
            id={props.sharedSetting.getItemDelegate().getId()}
            title={
                <div className="font-bold overflow-hidden text-ellipsis">
                    {props.sharedSetting.getItemDelegate().getName()}
                </div>
            }
            startAdornment={
                <div className="flex gap-1 items-center">
                    <DenseIconButton
                        onClick={handleToggleExpanded}
                        title={isExpanded ? "Hide settings" : "Show settings"}
                    >
                        {isExpanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                    </DenseIconButton>
                    <Link fontSize="inherit" />
                </div>
            }
            endAdornment={<Actions sharedSetting={props.sharedSetting} />}
            headerClassNames="!bg-teal-200"
        >
            <div
                className={resolveClassNames("grid grid-cols-[auto_1fr] items-center text-xs border", {
                    hidden: !isExpanded,
                })}
            >
                <SettingComponent setting={props.sharedSetting.getWrappedSetting()} manager={manager} />
            </div>
        </SortableListItem>
    );
}

type ActionProps = {
    sharedSetting: SharedSetting;
};

function Actions(props: ActionProps): React.ReactNode {
    function handleRemove() {
        const parentGroup = props.sharedSetting.getItemDelegate().getParentGroup();
        if (parentGroup) {
            parentGroup.removeChild(props.sharedSetting);
        }
    }

    return (
        <>
            <DenseIconButton onClick={handleRemove} title="Remove layer group">
                <Delete fontSize="inherit" />
            </DenseIconButton>
        </>
    );
}
