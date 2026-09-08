import React from "react";

import type { ContextMenuPopupProps, ContextMenuPositionerProps } from "@base-ui/react";
import { ContextMenu as ContextMenuBase } from "@base-ui/react";

import { ComponentSizeContext } from "@lib/components/_shared/contexts/componentSizeContext";
import { PortalContainerContext } from "@lib/components/_shared/contexts/portalContainerContext";
import { withDefaults } from "@lib/components/_shared/utils/defaultProps";
import { getTextSizeForSelectableSize, type SelectableSize } from "@lib/components/_shared/utils/size";
import { Typography } from "@lib/components/Typography";

/** A viewport-relative point the menu can be anchored to. */
export type ContextMenuPoint = { x: number; y: number };

export type MenuProps = Omit<ContextMenuPopupProps, "className" | "style"> & {
    children: React.ReactNode;
    /** Size of each menu item. @default "small" */
    itemSize?: SelectableSize;
    /** Which side of the anchor to display the menu. */
    side?: ContextMenuPositionerProps["side"];
    /** Alignment of the menu relative to the anchor. */
    align?: ContextMenuPositionerProps["align"];
    /**
     * Anchor the menu to a fixed location instead of the pointer position.
     *
     * Pass a viewport point (`{ x, y }`, in client coordinates) or any real / virtual
     * element. When set, this overrides the right-click position tracked by
     * `ContextMenu.Trigger` — typically combined with a controlled `open` /
     * `onOpenChange` on `ContextMenu.Root`.
     */
    anchor?: ContextMenuPoint | ContextMenuPositionerProps["anchor"];
};

function isContextMenuPoint(anchor: MenuProps["anchor"]): anchor is ContextMenuPoint {
    return (
        typeof anchor === "object" &&
        anchor !== null &&
        "x" in anchor &&
        "y" in anchor &&
        !("getBoundingClientRect" in anchor)
    );
}

const DEFAULT_PROPS = {
    itemSize: "small",
} satisfies Partial<MenuProps>;

export const Menu = React.forwardRef<HTMLDivElement, MenuProps>(function Menu(props, ref) {
    const defaultedProps = withDefaults(props, DEFAULT_PROPS);
    const { itemSize, side, align, anchor, children, ...otherProps } = defaultedProps;

    const portalContainer = React.useContext(PortalContainerContext);

    const anchorX = isContextMenuPoint(anchor) ? anchor.x : undefined;
    const anchorY = isContextMenuPoint(anchor) ? anchor.y : undefined;
    const resolvedAnchor = React.useMemo((): ContextMenuPositionerProps["anchor"] => {
        if (anchorX !== undefined && anchorY !== undefined) {
            return {
                getBoundingClientRect: () => DOMRect.fromRect({ x: anchorX, y: anchorY, width: 0, height: 0 }),
            };
        }
        return isContextMenuPoint(anchor) ? undefined : anchor;
    }, [anchor, anchorX, anchorY]);

    return (
        <ContextMenuBase.Portal container={portalContainer}>
            <ContextMenuBase.Positioner anchor={resolvedAnchor} side={side} align={align}>
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
