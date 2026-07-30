import React from "react";

import type { ComboboxItemProps, ContextMenuItemProps, MenuItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps, Combobox as ComboboxBase } from "@base-ui/react";

import { useMenuVariant } from "../../contexts/menuVariantContext";

import type { MenuItemContentProps } from "./itemContent";
import { ItemContent } from "./itemContent";

export type MenuVariantItemProps = ContextMenuItemProps | MenuItemProps | ComboboxItemProps;

const BASE_COMPONENT = {
    contextMenu: ContextMenuBase.Item,
    menu: MenuBase.Item,
    combobox: ComboboxBase.Item,
} as const;

function SharedMenuItemComponent<TProps extends MenuVariantItemProps>(
    props: TProps & MenuItemContentProps,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const menuVariant = useMenuVariant();
    const mergedProps = mergeProps({ className: "menu__item menu__interactable" }, props);

    const BaseComp = BASE_COMPONENT[menuVariant];

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

export const SharedMenuItem = React.forwardRef(SharedMenuItemComponent);
