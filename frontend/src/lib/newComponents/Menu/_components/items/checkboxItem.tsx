import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuCheckboxItemProps as MenuCheckboxItemBaseProps } from "@base-ui/react";

import { CheckboxIcon } from "@lib/newComponents/_shared/checkboxIcon";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ItemContent, type MenuItemContentProps } from "./itemContent";

export type MenuCheckboxItemProps = ComponentWrapperProps<MenuCheckboxItemBaseProps> &
    Omit<MenuItemContentProps, "icon">;

function CheckboxItemComponent(
    props: MenuCheckboxItemProps,
    ref: React.ForwardedRef<HTMLButtonElement>,
): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "description", "label");

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
            </ItemContent>
        </MenuBase.CheckboxItem>
    );
}

export const CheckboxItem = React.forwardRef(CheckboxItemComponent);
