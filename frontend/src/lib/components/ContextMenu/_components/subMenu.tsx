import type React from "react";

import type { ContextMenuSubmenuRootProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";
import { omit } from "lodash";

import type { MenuItemContentProps } from "@lib/components/_shared/components/menus/itemContent";
import { SubMenuTriggerItem } from "@lib/components/_shared/components/menus/subMenuTriggerItem";

import { Menu } from "./menu";

export type SubmenuProps = Omit<ContextMenuSubmenuRootProps, "className" | "style"> & {
    triggerContent: React.ReactNode;
    triggerTone?: MenuItemContentProps["tone"];
    triggerIcon?: MenuItemContentProps["icon"];
    triggerText?: MenuItemContentProps["text"];
    triggerDescription?: MenuItemContentProps["description"];
    children: React.ReactNode;
};

export function Submenu(props: SubmenuProps) {
    const baseProps = omit(
        props,
        "triggerContent",
        "triggerTone",
        "triggerIcon",
        "triggerText",
        "triggerDescription",
        "children",
    );

    return (
        <ContextMenuBase.SubmenuRoot {...baseProps}>
            <SubMenuTriggerItem
                tone={props.triggerTone}
                icon={props.triggerIcon}
                text={props.triggerText}
                description={props.triggerDescription}
            >
                {props.triggerContent}
            </SubMenuTriggerItem>
            <Menu side="right" align="start">
                {props.children}
            </Menu>
        </ContextMenuBase.SubmenuRoot>
    );
}
