import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuItemProps as MenuBaseItemProps } from "@base-ui/react";

import type { ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import type { MenuItemContentProps } from "./itemContent";
import { ItemContent } from "./itemContent";

export type MenuItemProps = ComponentWrapperProps<MenuBaseItemProps> & MenuItemContentProps;

function ItemComponent(props: MenuItemProps, ref: React.ForwardedRef<HTMLButtonElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "description", "icon", "label");

    return (
        <MenuBase.Item
            {...baseProps}
            ref={ref}
            className={resolveClassNames("menu__item menu__interactable", baseProps.className)}
        >
            <ItemContent icon={props.icon} description={props.description} text={props.text}>
                {props.children}
            </ItemContent>
        </MenuBase.Item>
    );
}

export const Item = React.forwardRef(ItemComponent);
