import type React from "react";

import { Dropdown } from "@mui/base";
import { Add, ArrowDropDown } from "@mui/icons-material";

import { Menu } from "@lib/components/Menu";
import { MenuButton } from "@lib/components/MenuButton/menuButton";
import { MenuDivider } from "@lib/components/MenuDivider";
import { MenuHeading } from "@lib/components/MenuHeading";
import { MenuItem } from "@lib/components/MenuItem";

export type Action = {
    identifier: string;
    icon?: React.ReactNode;
    label: string;
};

export type ActionGroup = {
    icon?: React.ReactNode;
    label: string;
    children: (Action | ActionGroup)[];
};

function isActionGroup(action: Action | ActionGroup): action is ActionGroup {
    return (action as ActionGroup).children !== undefined;
}

export type ActionsProps = {
    actionGroups: ActionGroup[];
    onActionClick: (actionIdentifier: string) => void;
};

export function Actions(props: ActionsProps): React.ReactNode {
    function makeContent(actionGroups: (ActionGroup | Action)[], indentLevel: number = 0): React.ReactNode[] {
        const content: React.ReactNode[] = [];
        for (const [index, item] of actionGroups.entries()) {
            if (isActionGroup(item)) {
                if (index > 0) {
                    content.push(<MenuDivider key={index} />);
                }
                content.push(
                    <MenuHeading
                        key={`${item.label}-${index}`}
                        style={{ paddingLeft: `${indentLevel + 1}rem` }}
                        classNames="flex gap-2 items-center"
                    >
                        {item.icon}
                        {item.label}
                    </MenuHeading>,
                );
                content.push(makeContent(item.children, indentLevel + 1));
            } else {
                content.push(
                    <MenuItem
                        key={`${item.identifier}-${index}`}
                        className="text-sm p-0.5 flex gap-2 items-center"
                        style={{ paddingLeft: `${indentLevel * 1}rem` }}
                        onClick={() => props.onActionClick(item.identifier)}
                    >
                        <span className="text-slate-700">{item.icon}</span>
                        {item.label}
                    </MenuItem>,
                );
            }
        }
        return content;
    }

    return (
        <Dropdown>
            <MenuButton label="Add items">
                <Add fontSize="inherit" />
                <span>Add</span>
                <ArrowDropDown fontSize="inherit" />
            </MenuButton>
            <Menu anchorOrigin="bottom-end" className="text-sm p-1 max-h-80 overflow-auto">
                {makeContent(props.actionGroups)}
            </Menu>
        </Dropdown>
    );
}
