import type React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type { MenuRootProps as MenuBaseRootProps } from "@base-ui/react";

import { MenuVariantContext } from "@lib/newComponents/_shared/contexts/menuVariantContext";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";

/** Accepts all standard menu root props except `className`, `render`, and `style`. Use `layoutClassName` for layout adjustments. */
export type MenuRootProps = ComponentWrapperProps<MenuBaseRootProps>;

export function Root(props: MenuRootProps): React.ReactNode {
    const baseProps = resolveWrapperProps(props);

    return (
        // Would normally have the root first, but the child MIGHT be a function,
        // so leaving the context wrap on top is easier in this case
        <MenuVariantContext.Provider value={"menu"}>
            <MenuBase.Root {...baseProps} />
        </MenuVariantContext.Provider>
    );
}
