import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuCheckboxItemProps as MenuCheckboxItemBaseProps } from "@base-ui/react";

import { CheckboxIcon } from "@lib/newComponents/_shared/checkboxIcon";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ItemContent, type MenuItemContentProps } from "./itemContent";

export type MenuCheckboxItemProps = ComponentWrapperProps<MenuCheckboxItemBaseProps> & MenuItemContentProps;

function CheckboxItemComponent(
    props: MenuCheckboxItemProps,
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "description", "label", "icon");

    return (
        <MenuBase.CheckboxItem
            {...baseProps}
            ref={ref}
            className={resolveClassNames("menu__item menu__interactable", baseProps.layoutClassName)}
        >
            <ItemContent
                text={props.text}
                description={props.description}
                icon={
                    <MenuBase.CheckboxItemIndicator
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
                {props.icon}
            </ItemContent>
        </MenuBase.CheckboxItem>
    );
}

export const CheckboxItem = React.forwardRef(CheckboxItemComponent);
