import React from "react";

import type { PopoverPositionerProps as PopoverPositionerBaseProps } from "@base-ui/react/popover";
import { Popover as PopoverBase } from "@base-ui/react/popover";

import { PortalContainerContext } from "../../_shared/contexts/portalContainerContext";

export type PopupProps = {
    /** The content rendered inside the popover. */
    children?: React.ReactNode;
    /** Alignment of the popover relative to the trigger. @default "center" */
    align?: PopoverPositionerBaseProps["align"];
    /** Which side of the trigger to display the popover. @default "bottom" */
    side?: PopoverPositionerBaseProps["side"];
    /** When true, the popover repositions to stay in view while scrolling. */
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
                    <PopoverBase.Viewport className="py-xs px-sm max-h-[80vh] max-w-md">
                        {props.children}
                    </PopoverBase.Viewport>
                </PopoverBase.Popup>
            </PopoverBase.Positioner>
        </PopoverBase.Portal>
    );
}
