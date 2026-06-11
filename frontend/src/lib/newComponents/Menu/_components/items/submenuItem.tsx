import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuSubmenuRootProps as SubmenuRootBaseProps } from "@base-ui/react";

import { SubMenuTriggerItem } from "@lib/newComponents/_shared/components/menus/subMenuTriggerItem";
import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

import { Popup } from "../popup";

export type SubmenuItemProps = ComponentWrapperProps<SubmenuRootBaseProps> & {
    triggerContent: React.ReactNode;
    children: React.ReactNode;
};

function SubmenuItemComponent(props: SubmenuItemProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props, "triggerContent", "children");
    return (
        <MenuBase.SubmenuRoot {...baseProps}>
            <SubMenuTriggerItem ref={ref}>{props.triggerContent}</SubMenuTriggerItem>
            <Popup side="right" align="start">
                {props.children}
            </Popup>
        </MenuBase.SubmenuRoot>
    );
}

export const SubmenuItem = React.forwardRef(SubmenuItemComponent);
