import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuTriggerProps as MenuBaseTriggerProps } from "@base-ui/react";

import { resolveWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import type { ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

export type MenuTriggerProps = ComponentWrapperProps<MenuBaseTriggerProps> & {
    children: React.ReactElement;
};

function TriggerComponent(props: MenuTriggerProps, ref: React.ForwardedRef<HTMLButtonElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props);

    return <MenuBase.Trigger {...baseProps} ref={ref} render={props.children} />;
}

export const Trigger = React.forwardRef(TriggerComponent);
