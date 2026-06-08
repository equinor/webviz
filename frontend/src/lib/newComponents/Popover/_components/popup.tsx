import React from "react";

import type { PopoverPositionerProps as PopoverPositionerBaseProps } from "@base-ui/react/popover";
import { Popover as PopoverBase } from "@base-ui/react/popover";

import { PortalContainerContext } from "../../_shared/contexts/portalContainerContext";

export type PopupProps = {
    children?: React.ReactNode;

    // Exposed props from base-ui parts
    align?: PopoverPositionerBaseProps["align"];
    side?: PopoverPositionerBaseProps["side"];
    sticky?: PopoverPositionerBaseProps["sticky"];
};

const DEFAULT_PROPS = {
    align: "center",
    side: "bottom",
} satisfies Partial<PopupProps>;

export function Popup(props: PopupProps): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };
    const portalContainer = React.useContext(PortalContainerContext);

    return (
        <PopoverBase.Portal container={portalContainer}>
            {/* Note the z-index class here. Base-ui assumes a different stacking context, so we need to manually ensure floating elements stay on top */}
            <PopoverBase.Positioner
                className="z-modal data-anchor-hidden:hidden"
                sideOffset={12}
                arrowPadding={16}
                align={defaultedProps.align}
                side={defaultedProps.side}
                sticky={defaultedProps.sticky}
            >
                <PopoverBase.Popup className="bg-floating border-neutral relative rounded-sm border shadow-md transition-opacity">
                    <PopoverBase.Arrow className="floating__arrow border-neutral border border-r-0 border-b-0" />
                    <PopoverBase.Viewport className="py-vertical-xs px-horizontal-sm max-h-[80vh] max-w-md">
                        {props.children}
                    </PopoverBase.Viewport>
                </PopoverBase.Popup>
            </PopoverBase.Positioner>
        </PopoverBase.Portal>
    );
}
