import React from "react";

import type { MenuItemProps as MenuBaseItemProps } from "@base-ui/react";

import type { MenuItemContentProps } from "@lib/newComponents/_shared/components/menus/itemContent";
import { SharedMenuItem } from "@lib/newComponents/_shared/components/menus/menuItem";
import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

export type MenuItemProps = ComponentWrapperProps<MenuBaseItemProps> & MenuItemContentProps;

function ItemComponent(props: MenuItemProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props);

    return <SharedMenuItem ref={ref} {...baseProps} />;
}

export const Item = React.forwardRef(ItemComponent);
