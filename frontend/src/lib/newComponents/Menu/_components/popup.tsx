import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type {
    MenuPopupProps as MenuBasePopupProps,
    MenuPositionerProps as MenuBasePositionerProps,
} from "@base-ui/react";
import { defaults } from "lodash";

import { ComponentSizeContext, useComponentSize } from "@lib/newComponents/_shared/contexts/componentSizeContext";
import { PortalContainerContext } from "@lib/newComponents/_shared/contexts/portalContainerContext";
import { getTextSizeForSelectableSize, type SelectableSize } from "@lib/newComponents/_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/utils/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type MenuPopupProps = ComponentWrapperProps<MenuBasePopupProps> & {
    /** Which side of the trigger to display the menu. @default "bottom" */
    side?: MenuBasePositionerProps["side"];
    /** Alignment of the menu relative to the trigger. @default "end" */
    align?: MenuBasePositionerProps["align"];
    /** Controls the size of items in the popup. @default "default" */
    itemSize?: SelectableSize;
};

const DEFAULT_PROPS = {
    side: "bottom",
    align: "end",
    itemSize: "default",
} satisfies Partial<MenuPopupProps>;

function PopupComponent(props: MenuPopupProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const defaultedProps = defaults({}, props, DEFAULT_PROPS);
    const baseProps = resolveWrapperProps(defaultedProps, "side", "align", "itemSize");

    const portalContainer = React.useContext(PortalContainerContext);
    const itemSize = useComponentSize({ size: props.itemSize });

    return (
        <MenuBase.Portal container={portalContainer}>
            <MenuBase.Positioner
                className="z-modal"
                side={defaultedProps.side}
                align={defaultedProps.align}
                sideOffset={4}
            >
                <Typography
                    {...baseProps}
                    as={MenuBase.Popup}
                    size={getTextSizeForSelectableSize(itemSize)}
                    ref={ref}
                    layoutClassName={resolveClassNames("menu__popup", baseProps.className)}
                >
                    <ComponentSizeContext.Provider value={itemSize}>{props.children}</ComponentSizeContext.Provider>
                </Typography>
            </MenuBase.Positioner>
        </MenuBase.Portal>
    );
}

export const Popup = React.forwardRef(PopupComponent);
