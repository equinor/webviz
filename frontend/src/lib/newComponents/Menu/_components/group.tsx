import React from "react";

import type { MenuGroupProps as MenuGroupBaseProps } from "@base-ui/react";
import { Menu as MenuBase } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";

export type MenuGroupProps = ComponentWrapperProps<MenuGroupBaseProps>;

function GroupComponent(props: MenuGroupProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const baseProps = resolveWrapperProps(props);

    return <MenuBase.Group {...baseProps} ref={ref} />;
}

export const Group = React.forwardRef(GroupComponent);
