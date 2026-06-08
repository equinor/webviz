import React from "react";

import type { MenuItemProps as MenuBaseItemProps } from "@base-ui/react";

import type { MenuItemContentProps } from "@lib/newComponents/_shared/components/menus/itemContent";
import { MenuItem } from "@lib/newComponents/_shared/components/menus/menuItem";
import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

export type MenuItemProps = ComponentWrapperProps<MenuBaseItemProps> & MenuItemContentProps;

function ItemComponent(props: MenuItemProps, ref: React.ForwardedRef<HTMLButtonElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props);

    return <MenuItem ref={ref} {...baseProps}></MenuItem>;
}

export const Item = React.forwardRef(ItemComponent);
