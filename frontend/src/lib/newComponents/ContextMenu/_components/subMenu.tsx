import type React from "react";

import type { ContextMenuSubmenuRootProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";
import { omit } from "lodash";

import { SubMenuTriggerItem } from "@lib/newComponents/_shared/components/menus/subMenuTriggerItem";

import { Menu } from "./menu";

export type SubmenuProps = Omit<ContextMenuSubmenuRootProps, "className" | "style"> & {
    triggerContent: React.ReactNode;
    children: React.ReactNode;
};

export function Submenu(props: SubmenuProps) {
    const baseProps = omit(props, "triggerContent", "children");

    return (
        <ContextMenuBase.SubmenuRoot {...baseProps}>
            <SubMenuTriggerItem>{props.triggerContent}</SubMenuTriggerItem>
            <Menu side="right" align="start">
                {props.children}
            </Menu>
        </ContextMenuBase.SubmenuRoot>
    );
}
