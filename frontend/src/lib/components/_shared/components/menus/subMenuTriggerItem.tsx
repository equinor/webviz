import React from "react";

import type { ContextMenuItemProps, MenuItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps } from "@base-ui/react";
import { ChevronRight } from "@mui/icons-material";

import type { MenuVariant } from "../../contexts/menuVariantContext";
import { useMenuVariant } from "../../contexts/menuVariantContext";

import type { MenuItemContentProps } from "./itemContent";
import { ItemContent } from "./itemContent";

export type MenuVariantItemProps = ContextMenuItemProps | MenuItemProps;

function SubMenuTriggerItemComponent<TProps extends MenuVariantItemProps>(
    props: TProps & MenuItemContentProps,
    ref: React.ForwardedRef<HTMLElement>,
): React.ReactNode {
    const menuVariant = useMenuVariant();
    const BaseComp = getBaseComponent(menuVariant);
    const mergedProps = mergeProps({ className: "menu__item menu__interactable menu__submenu_trigger" }, props);

    return (
        <BaseComp ref={ref} {...mergedProps}>
            <ItemContent icon={props.icon} description={props.description} text={props.text}>
                {props.children}
            </ItemContent>
            <ChevronRight fontSize="inherit" className="ml-auto" />
        </BaseComp>
    );
}

function getBaseComponent(variant: MenuVariant) {
    switch (variant) {
        case "contextMenu":
            return ContextMenuBase.SubmenuTrigger;
        case "menu":
            return MenuBase.SubmenuTrigger;
        case "combobox":
            throw new Error("Combobox has no sub-menu equivalent");
    }
}

export const SubMenuTriggerItem = React.forwardRef(SubMenuTriggerItemComponent);
