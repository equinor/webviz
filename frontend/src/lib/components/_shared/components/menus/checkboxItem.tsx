import React from "react";

import type { ComboboxItemProps, ContextMenuCheckboxItemProps, MenuCheckboxItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps, Combobox as ComboboxBase } from "@base-ui/react";

import { useMenuVariant } from "../../contexts/menuVariantContext";
import { CheckboxIcon } from "../checkboxIcon";

import { ItemContent, type MenuItemContentProps } from "./itemContent";

export type MenuVariantItemProps = ContextMenuCheckboxItemProps | MenuCheckboxItemProps | ComboboxItemProps;

const BASE_COMPONENT = {
    contextMenu: ContextMenuBase.CheckboxItem,
    menu: MenuBase.CheckboxItem,
    combobox: ComboboxBase.Item,
} as const;

const BASE_INDICATOR_COMPONENT = {
    contextMenu: ContextMenuBase.CheckboxItemIndicator,
    menu: MenuBase.CheckboxItemIndicator,
    combobox: ComboboxBase.ItemIndicator,
} as const;

function SharedCheckboxItemComponent<TProps extends MenuVariantItemProps>(
    props: TProps & MenuItemContentProps,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const { text, description, icon, ...otherProps } = props;
    const menuVariant = useMenuVariant();
    const mergedProps = mergeProps({ className: "menu__item menu__interactable" }, otherProps);

    const BaseComp = BASE_COMPONENT[menuVariant];
    const BaseIndicatorComp = BASE_INDICATOR_COMPONENT[menuVariant];

    return (
        <ItemContent
            {...mergedProps}
            render={<BaseComp ref={ref} />}
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
    );
}

export const SharedCheckboxItem = React.forwardRef(SharedCheckboxItemComponent);
