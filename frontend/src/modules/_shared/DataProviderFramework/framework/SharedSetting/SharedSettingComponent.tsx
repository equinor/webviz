import type React from "react";

import { Delete, ExpandLess, ExpandMore, Link } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { SortableListItem } from "../../components/item";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import { SettingManagerComponent } from "../SettingManager/SettingManagerComponent";

import type { SharedSetting } from "./SharedSetting";

export type SharedSettingComponentProps = {
    sharedSetting: SharedSetting<any>;
};

export function SharedSettingComponent(props: SharedSettingComponentProps): React.ReactNode {
    const isExpanded = usePublishSubscribeTopicValue(props.sharedSetting.getItemDelegate(), ItemDelegateTopic.EXPANDED);

    const manager = props.sharedSetting.getItemDelegate().getDataProviderManager();
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
                <div className="font-bolder overflow-hidden text-ellipsis">
                    {props.sharedSetting.getItemDelegate().getName()}
                </div>
            }
            startAdornment={
                <div className="gap-horizontal-2xs flex items-center">
                    <Button
                        onClick={handleToggleExpanded}
                        title={isExpanded ? "Hide settings" : "Show settings"}
                        iconOnly
                        size="small"
                        variant="text"
                        tone="neutral"
                    >
                        {isExpanded ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                    </Button>
                    <Link fontSize="inherit" />
                </div>
            }
            endAdornment={<Actions sharedSetting={props.sharedSetting} />}
            headerClassNames="bg-accent!"
        >
            <div
                className={resolveClassNames(
                    "border-neutral-subtle grid grid-cols-[auto_1fr] items-center border text-xs",
                    {
                        hidden: !isExpanded,
                    },
                )}
            >
                <SettingManagerComponent
                    setting={props.sharedSetting.getWrappedSetting()}
                    manager={manager}
                    sharedSetting
                />
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
            <Button onClick={handleRemove} title="Remove group" variant="text" tone="danger" iconOnly size="small">
                <Delete fontSize="inherit" />
            </Button>
        </>
    );
}
