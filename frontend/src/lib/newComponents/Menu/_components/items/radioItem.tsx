import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuRadioItemProps as MenuRadioItemBaseProps } from "@base-ui/react";

import { RadioButtonIcon } from "@lib/newComponents/_shared/radioButtonIcon";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ItemContent, type MenuItemContentProps } from "./itemContent";

export type MenuRadioItemProps = ComponentWrapperProps<MenuRadioItemBaseProps> & MenuItemContentProps;

function RadioItemComponent(props: MenuRadioItemProps, ref: React.ForwardedRef<HTMLButtonElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "description", "icon", "text") as MenuRadioItemBaseProps;

    return (
        <MenuBase.RadioItem
            {...baseProps}
            ref={ref}
            className={resolveClassNames("menu__item menu__interactable", props.layoutClassName)}
        >
            <ItemContent
                text={props.text}
                description={props.description}
                icon={
                    <MenuBase.RadioItemIndicator
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
                {props.icon}
            </ItemContent>
        </MenuBase.RadioItem>
    );
}

export const RadioItem = React.forwardRef(RadioItemComponent);
