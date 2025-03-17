import React from "react";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { DenseIconButtonColorScheme } from "@lib/components/DenseIconButton/denseIconButton";
import { SortableListItem } from "@lib/components/SortableList";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Delete, ExpandLess, ExpandMore, Link } from "@mui/icons-material";

import { SharedSetting } from "./SharedSetting";

import { usePublishSubscribeTopicValue } from "../../../utils/PublishSubscribeDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import { SettingComponent } from "../SettingManager/SettingComponent";

export type SharedSettingComponentProps = {
    sharedSetting: SharedSetting<any>;
};

export function SharedSettingComponent(props: SharedSettingComponentProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.sharedSetting.getItemDelegate(), ItemDelegateTopic.EXPANDED);

    const manager = props.sharedSetting.getItemDelegate().getLayerManager();
    if (!manager) {
        return null;
    }

    function handleToggleExpanded() {
        props.sharedSetting.getItemDelegate().setExpanded(!isExpanded);
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
                <SettingComponent setting={props.sharedSetting.getWrappedSetting()} manager={manager} sharedSetting />
            </div>
        </SortableListItem>
    );
}

type ActionProps = {
    sharedSetting: SharedSetting<any>;
};

function Actions(props: ActionProps): React.ReactNode {
    function handleRemove() {
        props.sharedSetting.beforeDestroy();
        const parentGroup = props.sharedSetting.getItemDelegate().getParentGroup();
        if (parentGroup) {
            parentGroup.removeChild(props.sharedSetting);
        }
    }

    return (
        <>
            <DenseIconButton
                onClick={handleRemove}
                title="Remove layer group"
                colorScheme={DenseIconButtonColorScheme.DANGER}
            >
                <Delete fontSize="inherit" />
            </DenseIconButton>
        </>
    );
}
