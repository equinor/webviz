import React from "react";

import type { ContextMenuSubmenuRootProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

import { PortalContainerContext } from "../../_shared/contexts/portalContainerContext";

export type SubmenuProps = Omit<ContextMenuSubmenuRootProps, "className" | "style"> & {
    children: React.ReactNode;
};

export function Submenu(props: SubmenuProps) {
    const portalContainer = React.useContext(PortalContainerContext);
    return (
        <ContextMenuBase.SubmenuRoot {...props}>
            <ContextMenuBase.SubmenuTrigger className="w-full"></ContextMenuBase.SubmenuTrigger>
            <ContextMenuBase.Portal container={portalContainer}>
                <ContextMenuBase.Positioner>
                    <ContextMenuBase.Popup className="">{props.children}</ContextMenuBase.Popup>
                </ContextMenuBase.Positioner>
            </ContextMenuBase.Portal>
        </ContextMenuBase.SubmenuRoot>
    );
}
