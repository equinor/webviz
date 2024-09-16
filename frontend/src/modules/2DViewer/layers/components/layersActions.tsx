import React from "react";

import { Menu } from "@lib/components/Menu";
import { MenuDivider } from "@lib/components/MenuDivider";
import { MenuHeading } from "@lib/components/MenuHeading";
import { MenuItem } from "@lib/components/MenuItem";
import { Dropdown, MenuButton } from "@mui/base";
import { Add, ArrowDropDown, GridView } from "@mui/icons-material";

export type LayersAction = {
    identifier: string;
    label: string;
};

export type LayersActionGroup = {
    label: string;
    children: (LayersAction | LayersActionGroup)[];
};

function isLayersActionGroup(action: LayersAction | LayersActionGroup): action is LayersActionGroup {
    return (action as LayersActionGroup).children !== undefined;
}

export type LayersActionsProps<TLayerType extends string, TSettingType extends string> = {
    layersActionGroups: LayersActionGroup[];
    onActionClick: (actionIdentifier: string) => void;
};

export function LayersActions<TLayerType extends string, TSettingType extends string>(
    props: LayersActionsProps<TLayerType, TSettingType>
): React.ReactNode {
    function makeContent(
        layersActionGroups: (LayersActionGroup | LayersAction)[],
        indentLevel: number = 0
    ): React.ReactNode[] {
        const content: React.ReactNode[] = [];
        for (const [index, item] of layersActionGroups.entries()) {
            if (isLayersActionGroup(item)) {
                if (index > 0) {
                    content.push(<MenuDivider key={index} />);
                }
                content.push(
                    <MenuHeading key={`${item.label}-${index}`} style={{ paddingLeft: `${indentLevel * 1}rem` }}>
                        {item.label}
                    </MenuHeading>
                );
                content.push(makeContent(item.children, indentLevel + 1));
            } else {
                content.push(
                    <MenuItem
                        key={item.identifier}
                        className="text-sm p-0.5"
                        style={{ paddingLeft: `${indentLevel * 1}rem` }}
                        onClick={() => props.onActionClick(item.identifier)}
                    >
                        {item.label}
                    </MenuItem>
                );
            }
        }
        return content;
    }

    return (
        <Dropdown>
            <MenuButton>
                <div className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-sm flex items-center gap-2">
                    <Add fontSize="inherit" />
                    <span>Add</span>
                    <ArrowDropDown fontSize="inherit" />
                </div>
            </MenuButton>
            <Menu anchorOrigin="bottom-end" className="text-sm p-1">
                {makeContent(props.layersActionGroups)}
            </Menu>
        </Dropdown>
    );
}
