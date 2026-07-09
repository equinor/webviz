import React from "react";

import type { ComboboxItemProps, ContextMenuItemProps, MenuItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps, Combobox as ComboboxBase } from "@base-ui/react";

import type { MenuVariant } from "../../contexts/menuVariantContext";
import { useMenuVariant } from "../../contexts/menuVariantContext";

import type { MenuItemContentProps } from "./itemContent";
import { ItemContent } from "./itemContent";

export type MenuVariantItemProps = ContextMenuItemProps | MenuItemProps | ComboboxItemProps;

function SharedMenuItemComponent<TProps extends MenuVariantItemProps>(
    props: TProps & MenuItemContentProps,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const menuVariant = useMenuVariant();
    const BaseComp = getBaseComponent(menuVariant);
    const mergedProps = mergeProps({ className: "menu__item menu__interactable" }, props);

    return (
        <ItemContent
            {...mergedProps}
            render={<BaseComp ref={ref} />}
            icon={props.icon}
            description={props.description}
            text={props.text}
        >
            {props.children}
        </ItemContent>
    );
}

function getBaseComponent(variant: MenuVariant) {
    switch (variant) {
        case "contextMenu":
            return ContextMenuBase.Item;
        case "menu":
            return MenuBase.Item;
        case "combobox":
            return ComboboxBase.Item;
    }
}

export const SharedMenuItem = React.forwardRef(SharedMenuItemComponent);
