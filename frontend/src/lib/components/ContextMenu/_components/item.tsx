import React from "react";

import type { ContextMenuItemProps } from "@base-ui/react";

import type { MenuItemContentProps } from "@lib/components/_shared/components/menus/itemContent";
import { SharedMenuItem } from "@lib/components/_shared/components/menus/menuItem";
import type { ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/components/_shared/utils/wrapperProps";

export type ItemProps = ComponentWrapperProps<ContextMenuItemProps> & MenuItemContentProps;

export const Item = React.forwardRef<HTMLDivElement, ItemProps>(function Item(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return <SharedMenuItem ref={ref} {...baseProps} />;
});
