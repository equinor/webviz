import React from "react";

import { SortableListItem } from "@lib/components/SortableList";
import { Delete, Link } from "@mui/icons-material";

import { SettingComponent } from "./SettingComponent";

import { SharedSetting } from "../SharedSetting";

export type SharedSettingComponentProps = {
    sharedSetting: SharedSetting;
    onRemove: (id: string) => void;
};

export function SharedSettingComponent(props: SharedSettingComponentProps): React.ReactNode {
    const manager = props.sharedSetting.getItemDelegate().getLayerManager();
    if (!manager) {
        return null;
    }
    return (
        <SortableListItem
            key={props.sharedSetting.getItemDelegate().getId()}
            id={props.sharedSetting.getItemDelegate().getId()}
            title={<span className="font-bold">{props.sharedSetting.getItemDelegate().getName()}</span>}
            startAdornment={<Link fontSize="inherit" />}
            endAdornment={<Actions sharedSetting={props.sharedSetting} />}
            headerClassNames="!bg-teal-200"
        >
            <SettingComponent
                setting={props.sharedSetting.getWrappedSetting()}
                workbenchSession={manager.getWorkbenchSession()}
                workbenchSettings={manager.getWorkbenchSettings()}
            />
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
            <div
                className="hover:cursor-pointer rounded hover:text-red-800"
                onClick={handleRemove}
                title="Remove layer group"
            >
                <Delete fontSize="inherit" />
            </div>
        </>
    );
}
