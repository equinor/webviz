import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuSubmenuRootProps as SubmenuRootBaseProps } from "@base-ui/react";

import type { MenuItemContentProps } from "@lib/components/_shared/components/menus/itemContent";
import { SubMenuTriggerItem } from "@lib/components/_shared/components/menus/subMenuTriggerItem";
import type { ComponentWrapperProps } from "@lib/components/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/components/_shared/utils/wrapperProps";

import { Popup } from "../popup";

export type SubmenuItemProps = ComponentWrapperProps<SubmenuRootBaseProps> & {
    triggerContent: React.ReactNode;
    triggerTone?: MenuItemContentProps["tone"];
    triggerIcon?: MenuItemContentProps["icon"];
    triggerText?: MenuItemContentProps["text"];
    triggerDescription?: MenuItemContentProps["description"];
    children: React.ReactNode;
};

export const SubmenuItem = React.forwardRef<HTMLDivElement, SubmenuItemProps>(function SubmenuItem(props, ref) {
    const baseProps = resolveWrapperProps(
        props,
        "triggerTone",
        "triggerContent",
        "triggerIcon",
        "triggerText",
        "triggerDescription",
        "children",
    );

    return (
        <MenuBase.SubmenuRoot {...baseProps}>
            <SubMenuTriggerItem
                ref={ref}
                tone={props.triggerTone}
                icon={props.triggerIcon}
                text={props.triggerText}
                description={props.triggerDescription}
            >
                {props.triggerContent}
            </SubMenuTriggerItem>
            <Popup side="right" align="start">
                {props.children}
            </Popup>
        </MenuBase.SubmenuRoot>
    );
});
