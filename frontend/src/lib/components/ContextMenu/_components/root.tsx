import type { ContextMenuRootProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

import { MenuVariantContext } from "@lib/components/_shared/contexts/menuVariantContext";

export type RootProps = Omit<ContextMenuRootProps, "className" | "style"> & {
    children: React.ReactNode;
};

export function Root(props: RootProps) {
    return (
        <ContextMenuBase.Root {...props}>
            <MenuVariantContext.Provider value={"contextMenu"}>{props.children}</MenuVariantContext.Provider>
        </ContextMenuBase.Root>
    );
}
