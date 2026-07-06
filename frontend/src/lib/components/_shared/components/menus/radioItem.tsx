import React from "react";

import type { ContextMenuRadioItemProps, MenuRadioItemProps } from "@base-ui/react";
import { Menu as MenuBase, ContextMenu as ContextMenuBase, mergeProps } from "@base-ui/react";

import { useMenuVariant } from "../../contexts/menuVariantContext";
import { RadioButtonIcon } from "../radioButtonIcon";

import { ItemContent, type MenuItemContentProps } from "./itemContent";

export type MenuVariantItemProps = ContextMenuRadioItemProps | MenuRadioItemProps;

const BASE_COMPONENT = {
    contextMenu: ContextMenuBase.RadioItem,
    menu: MenuBase.RadioItem,
    combobox: () => {
        throw new Error("Combobox has no Radio-item equivalent");
    },
} as const;

const BASE_INDICATOR_COMPONENT = {
    contextMenu: ContextMenuBase.RadioItemIndicator,
    menu: MenuBase.RadioItemIndicator,
    combobox: () => {
        throw new Error("Combobox has no Radio-item indicator equivalent");
    },
} as const;

function SharedRadioItemComponent<TProps extends MenuVariantItemProps>(
    props: TProps & MenuItemContentProps,
    ref: React.ForwardedRef<HTMLDivElement>,
): React.ReactNode {
    const { text, description, icon, value, ...otherProps } = props;
    const menuVariant = useMenuVariant();
    const mergedProps = mergeProps({ className: "menu__item menu__interactable" }, otherProps);

    const BaseComp = BASE_COMPONENT[menuVariant];
    const BaseIndicatorComp = BASE_INDICATOR_COMPONENT[menuVariant];

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

export const SharedRadioItem = React.forwardRef(SharedRadioItemComponent);
