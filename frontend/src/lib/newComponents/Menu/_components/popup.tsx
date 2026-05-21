import React from "react";

import { Menu as MenuBase } from "@base-ui/react";
import type {
    MenuPopupProps as MenuBasePopupProps,
    MenuPositionerProps as MenuBasePositionerProps,
} from "@base-ui/react";
import { defaults } from "lodash";

import { getTextSizeForSelectableSize, type SelectableSize } from "@lib/newComponents/_shared/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "@lib/newComponents/_shared/wrapperProps";
import { Typography } from "@lib/newComponents/Typography";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ItemSizeContext } from "../_contexts/itemSizeContext";

export type MenuPopupProps = ComponentWrapperProps<MenuBasePopupProps> & {
    side?: MenuBasePositionerProps["side"];
    align?: MenuBasePositionerProps["align"];
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

    return (
        <MenuBase.Portal>
            <MenuBase.Positioner
                className="z-modal"
                side={defaultedProps.side}
                align={defaultedProps.align}
                sideOffset={4}
            >
                <Typography
                    {...baseProps}
                    as={MenuBase.Popup}
                    size={getTextSizeForSelectableSize(defaultedProps.itemSize)}
                    ref={ref}
                    className={resolveClassNames("menu__popup", baseProps.className)}
                >
                    <ItemSizeContext.Provider value={defaultedProps.itemSize}>
                        {props.children}
                    </ItemSizeContext.Provider>
                </Typography>
            </MenuBase.Positioner>
        </MenuBase.Portal>
    );
}

export const Popup = React.forwardRef(PopupComponent);
