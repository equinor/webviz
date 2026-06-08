import React from "react";

import type { ComboboxItemProps, ContextMenuItemProps, MenuItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps } from "@base-ui/react";

import type { MenuVariant } from "../../contexts/menuVariantContext";
import { useMenuVariant } from "../../contexts/menuVariantContext";

export type MenuVariantItemProps = ContextMenuItemProps | MenuItemProps | ComboboxItemProps;

function MenuItemComponent<TProps extends ContextMenuItemProps | MenuItemProps | ComboboxItemProps>(
    props: TProps,
    ref: React.ForwardedRef<HTMLElement>,
): React.ReactNode {
    const menuVariant = useMenuVariant();
    const BaseComp = getBaseComponent(menuVariant);
    const mergedProps = mergeProps({ className: "menu__item menu__interactable" }, props);

    return <BaseComp ref={ref} {...mergedProps} />;
}

function getBaseComponent(variant: MenuVariant) {
    switch (variant) {
        case "contextMenu":
            return ContextMenuBase.Item;
        case "menu":
            return MenuBase.Item;
    }
}

export const MenuItem = React.forwardRef(MenuItemComponent);
