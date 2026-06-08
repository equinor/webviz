import React from "react";

import type { ContextMenuItemProps, MenuItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps } from "@base-ui/react";

import type { MenuVariant } from "../../contexts/menuVariantContext";
import { useMenuVariant } from "../../contexts/menuVariantContext";

import type { MenuItemContentProps } from "./itemContent";
import { ItemContent } from "./itemContent";

export type MenuVariantItemProps = ContextMenuItemProps | MenuItemProps;

function MenuItemComponent<TProps extends MenuVariantItemProps>(
    props: TProps & MenuItemContentProps,
    ref: React.ForwardedRef<HTMLElement>,
): React.ReactNode {
    const menuVariant = useMenuVariant();
    const BaseComp = getBaseComponent(menuVariant);
    const mergedProps = mergeProps({ className: "menu__item menu__interactable" }, props);

    return (
        <BaseComp {...mergedProps} ref={ref}>
            <ItemContent icon={props.icon} description={props.description} text={props.text}>
                {props.children}
            </ItemContent>
        </BaseComp>
    );
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
