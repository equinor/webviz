import React from "react";

import type { ComboboxItemProps, ContextMenuCheckboxItemProps, MenuCheckboxItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps, Combobox as ComboboxBase } from "@base-ui/react";

import type { MenuVariant } from "../../contexts/menuVariantContext";
import { useMenuVariant } from "../../contexts/menuVariantContext";
import { CheckboxIcon } from "../checkboxIcon";

import { ItemContent, type MenuItemContentProps } from "./itemContent";

export type MenuVariantItemProps = ContextMenuCheckboxItemProps | MenuCheckboxItemProps | ComboboxItemProps;

function SharedCheckboxItemComponent<TProps extends MenuVariantItemProps>(
    props: TProps & MenuItemContentProps,
    ref: React.ForwardedRef<HTMLDivElement>,
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
                    <>
                        <BaseIndicatorComp
                            className="menu__toggle_indicator"
                            keepMounted
                            render={(p: any, s: any) => (
                                <span {...p}>
                                    <CheckboxIcon
                                        {...s}
                                        // Combobox items are "selected", not "checked"
                                        checked={s.checked ?? s.selected}
                                    />
                                </span>
                            )}
                        />
                        {icon}
                    </>
                }
            >
                {props.children}
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
        case "combobox":
            return ComboboxBase.ItemIndicator;
    }
}

function getBaseComponent(variant: MenuVariant) {
    switch (variant) {
        case "contextMenu":
            return ContextMenuBase.CheckboxItem;
        case "menu":
            return MenuBase.CheckboxItem;
        case "combobox":
            return ComboboxBase.Item;
    }
}

export const SharedCheckboxItem = React.forwardRef(SharedCheckboxItemComponent);
