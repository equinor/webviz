import React from "react";

import type { ContextMenuItemProps, MenuItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps } from "@base-ui/react";
import { ChevronRight } from "@mui/icons-material";

import { useMenuVariant } from "../../contexts/menuVariantContext";

import type { MenuItemContentProps } from "./itemContent";
import { ItemContent } from "./itemContent";

export type MenuVariantItemProps = ContextMenuItemProps | MenuItemProps;

const BASE_COMPONENT = {
    contextMenu: ContextMenuBase.SubmenuTrigger,
    menu: MenuBase.SubmenuTrigger,
    combobox: () => {
        throw new Error("Combobox has no sub-menu equivalent");
    },
} as const;

function SubMenuTriggerItemComponent<TProps extends MenuVariantItemProps>(
    props: TProps & MenuItemContentProps,
    ref: React.ForwardedRef<HTMLElement>,
): React.ReactNode {
    const menuVariant = useMenuVariant();
    const mergedProps = mergeProps({ className: "menu__item menu__interactable menu__submenu_trigger" }, props);

    const BaseComp = BASE_COMPONENT[menuVariant];

    return (
        <BaseComp ref={ref} {...mergedProps}>
            <ItemContent icon={props.icon} description={props.description} text={props.text}>
                {props.children}
            </ItemContent>
            <ChevronRight fontSize="inherit" className="ml-2xs" />
        </BaseComp>
    );
}

export const SubMenuTriggerItem = React.forwardRef(SubMenuTriggerItemComponent);
