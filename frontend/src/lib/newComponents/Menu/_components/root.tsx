import { Menu as MenuBase } from "@base-ui/react";
import type { MenuRootProps as MenuBaseRootProps } from "@base-ui/react";

import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";

export type MenuRootProps = ComponentWrapperProps<MenuBaseRootProps>;

export function Root(props: MenuRootProps) {
    const baseProps = resolveWrapperProps(props);

    return <MenuBase.Root {...baseProps} />;
}
