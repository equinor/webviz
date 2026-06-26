import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuTriggerProps as MenuBaseTriggerProps } from "@base-ui/react";

import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

export type MenuTriggerProps = ComponentWrapperProps<MenuBaseTriggerProps> & {
    /** The element that opens the menu when clicked. */
    children: React.ReactElement;
};

export const Trigger = React.forwardRef<HTMLButtonElement, MenuTriggerProps>(function Trigger(props, ref) {
    const baseProps = resolveWrapperProps(props);

    return <MenuBase.Trigger {...baseProps} ref={ref} render={props.children} />;
});
