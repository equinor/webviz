import React from "react";

import type { ContextMenuPopupProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

import { PortalContainerContext } from "../../_shared/portalContainerContext";

export type MenuProps = Omit<ContextMenuPopupProps, "className" | "style"> & {
    children: React.ReactNode;
};

export function Menu(props: MenuProps) {
    const portalContainer = React.useContext(PortalContainerContext);
    return (
        <ContextMenuBase.Portal container={portalContainer}>
            <ContextMenuBase.Positioner>
                <ContextMenuBase.Popup
                    className="bg-floating shadow-elevation-overlay py-vertical-xs min-w-20 origin-(--transform-origin) rounded outline-0 transition-all data-ending-style:opacity-0"
                    {...props}
                >
                    {props.children}
                </ContextMenuBase.Popup>
            </ContextMenuBase.Positioner>
        </ContextMenuBase.Portal>
    );
}
