import React from "react";

import type { ContextMenuPopupProps, ContextMenuPositionerProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

import { ComponentSizeContext } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import { getTextSizeForSelectableSize, type SelectableSize } from "@lib/newComponents/_shared/utils/size";
import { Typography } from "@lib/newComponents/Typography";

import { PortalContainerContext } from "../../_shared/contexts/portalContainerContext";

export type MenuProps = Omit<ContextMenuPopupProps, "className" | "style"> & {
    children: React.ReactNode;
    itemSize?: SelectableSize;
    side?: ContextMenuPositionerProps["side"];
    align?: ContextMenuPositionerProps["align"];
};

export function Menu(props: MenuProps) {
    const { itemSize = "small", side, align, ...otherProps } = props;

    const portalContainer = React.useContext(PortalContainerContext);

    return (
        <ContextMenuBase.Portal container={portalContainer}>
            <ContextMenuBase.Positioner side={side} align={align}>
                <Typography
                    {...otherProps}
                    as={ContextMenuBase.Popup}
                    size={getTextSizeForSelectableSize(itemSize)}
                    layoutClassName="menu__popup"
                >
                    <ComponentSizeContext.Provider value={itemSize}>{props.children}</ComponentSizeContext.Provider>
                </Typography>
            </ContextMenuBase.Positioner>
        </ContextMenuBase.Portal>
    );
}
