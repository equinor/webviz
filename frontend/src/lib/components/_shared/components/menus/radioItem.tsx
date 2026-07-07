import React from "react";

import type { ContextMenuRadioItemProps, MenuRadioItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps } from "@base-ui/react";

import type { MenuVariant } from "../../contexts/menuVariantContext";
import { useMenuVariant } from "../../contexts/menuVariantContext";
import { RadioButtonIcon } from "../radioButtonIcon";

import { ItemContent, type MenuItemContentProps } from "./itemContent";

export type MenuVariantItemProps = ContextMenuRadioItemProps | MenuRadioItemProps;

function SharedRadioItemComponent<TProps extends MenuVariantItemProps>(
    props: TProps & MenuItemContentProps,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const { text, description, icon, value, ...otherProps } = props;
    const menuVariant = useMenuVariant();
    const BaseComp = getBaseComponent(menuVariant);
    const BaseIndicatorComp = getBaseIndicatorComponent(menuVariant);
    const mergedProps = mergeProps({ className: "menu__item menu__interactable" }, otherProps);

    return (
        <BaseComp {...mergedProps} value={value} ref={ref}>
            <ItemContent
                text={text}
                description={description}
                icon={
                    <BaseIndicatorComp
                        className="menu__toggle_indicator"
                        keepMounted
                        render={(p, s) => (
                            <span {...p}>
                                <RadioButtonIcon {...s} />
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
            return ContextMenuBase.RadioItemIndicator;
        case "menu":
            return MenuBase.RadioItemIndicator;
        case "combobox":
            throw new Error("Combobox has no Radio-item equivalent");
    }
}

function getBaseComponent(variant: MenuVariant) {
    switch (variant) {
        case "contextMenu":
            return ContextMenuBase.RadioItem;
        case "menu":
            return MenuBase.RadioItem;
        case "combobox":
            throw new Error("Combobox has no Radio-item equivalent");
    }
}

export const SharedRadioItem = React.forwardRef(SharedRadioItemComponent);
