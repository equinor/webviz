import React from "react";

import type { ContextMenuPopupProps, ContextMenuPositionerProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

import { ComponentSizeContext } from "@lib/components/_shared/contexts/componentSizeContext";
import { PortalContainerContext } from "@lib/components/_shared/contexts/portalContainerContext";
import { withDefaults } from "@lib/components/_shared/utils/defaultProps";
import { getTextSizeForSelectableSize, type SelectableSize } from "@lib/components/_shared/utils/size";
import { Typography } from "@lib/components/Typography";

export type MenuProps = Omit<ContextMenuPopupProps, "className" | "style"> & {
    children: React.ReactNode;
    /** Size of each menu item. @default "small" */
    itemSize?: SelectableSize;
    /** Which side of the anchor to display the menu. */
    side?: ContextMenuPositionerProps["side"];
    /** Alignment of the menu relative to the anchor. */
    align?: ContextMenuPositionerProps["align"];
};

const DEFAULT_PROPS = {
    itemSize: "small",
} satisfies Partial<MenuProps>;

export const Menu = React.forwardRef<HTMLDivElement, MenuProps>(function Menu(props, ref) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const { itemSize, side, align, children, ...otherProps } = defaultedProps;

    const portalContainer = React.useContext(PortalContainerContext);

    return (
        <ContextMenuBase.Portal container={portalContainer}>
            <ContextMenuBase.Positioner side={side} align={align}>
                <Typography
                    {...otherProps}
                    as={ContextMenuBase.Popup}
                    size={getTextSizeForSelectableSize(itemSize)}
                    ref={ref}
                    layoutClassName="menu__popup"
                >
                    <ComponentSizeContext.Provider value={itemSize}>{children}</ComponentSizeContext.Provider>
                </Typography>
            </ContextMenuBase.Positioner>
        </ContextMenuBase.Portal>
    );
});
