import React from "react";

import type { ContextMenuCheckboxItemProps, MenuCheckboxItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps } from "@base-ui/react";

import type { MenuVariant } from "../../contexts/menuVariantContext";
import { useMenuVariant } from "../../contexts/menuVariantContext";
import { CheckboxIcon } from "../checkboxIcon";

import { ItemContent, type MenuItemContentProps } from "./itemContent";

export type MenuVariantItemProps = ContextMenuCheckboxItemProps | MenuCheckboxItemProps;

function SharedCheckboxItemComponent<TProps extends MenuVariantItemProps>(
    props: TProps & MenuItemContentProps,
    ref: React.ForwardedRef<HTMLElement>,
): React.ReactNode {
    const { text, description, icon, ...otherProps } = props;
    const menuVariant = useMenuVariant();
    const BaseComp = getBaseComponent(menuVariant);
    const BaseIndicatorComp = getBaseIndicatorComponent(menuVariant);
    const mergedProps = mergeProps({ className: "menu__item menu__interactable" }, otherProps);

    return (
        <BaseComp {...mergedProps} ref={ref}>
            <ItemContent
                text={text}
                description={description}
                icon={
                    <BaseIndicatorComp
                        className="menu__toggle_indicator"
                        keepMounted
                        render={(p, s) => (
                            <span {...p}>
                                <CheckboxIcon {...s} />
                            </span>
                        )}
                    />
                }
            >
                {props.children}
                {icon}
            </ItemContent>
        </BaseComp>
    );
}

function getBaseIndicatorComponent(variant: MenuVariant) {
    switch (variant) {
        case "contextMenu":
            return ContextMenuBase.CheckboxItemIndicator;
        case "menu":
            return MenuBase.CheckboxItemIndicator;
    }
}

function getBaseComponent(variant: MenuVariant) {
    switch (variant) {
        case "contextMenu":
            return ContextMenuBase.CheckboxItem;
        case "menu":
            return MenuBase.CheckboxItem;
    }
}

export const SharedCheckboxItem = React.forwardRef(SharedCheckboxItemComponent);
