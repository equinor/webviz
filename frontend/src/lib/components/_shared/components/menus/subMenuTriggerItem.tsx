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
        <ItemContent
            {...mergedProps}
            icon={props.icon}
            description={props.description}
            text={props.text}
            render={(p) => (
                <BaseComp {...p} ref={ref}>
                    {p.children}
                    <ChevronRight fontSize="inherit" className="ml-auto" />
                </BaseComp>
            )}
        >
            {props.children}
        </ItemContent>
    );
}

export const SubMenuTriggerItem = React.forwardRef(SubMenuTriggerItemComponent);
