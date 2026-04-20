import type React from "react";

import type { PopoverPositionerProps as PopoverPositionerBaseProps } from "@base-ui/react/popover";
import { Popover as PopoverBase } from "@base-ui/react/popover";

export type PopupProps = {
    children?: React.ReactNode;

    // Exposed props from base-ui parts
    align?: PopoverPositionerBaseProps["align"];
    side?: PopoverPositionerBaseProps["side"];
};

const DEFAULT_PROPS = {
    align: "center",
    side: "bottom",
} satisfies Partial<PopupProps>;

export function Popup(props: PopupProps): React.ReactNode {
    const defaultedProps = { ...DEFAULT_PROPS, ...props };

    return (
        <PopoverBase.Portal>
            {/* Note the z-index class here. Base-ui assumes a different stacking context, so we need to manually ensure floating elements stay on top */}
            <PopoverBase.Positioner
                className="z-elevated"
                sideOffset={12}
                arrowPadding={16}
                align={defaultedProps.align}
                side={defaultedProps.side}
            >
                <PopoverBase.Popup className="bg-floating border-neutral relative rounded-sm border shadow-md transition-opacity">
                    <PopoverBase.Arrow className="border-neutral size- size-[0.75rem] border border-r-0 border-b-0 bg-inherit data-[side=bottom]:-top-1.5 data-[side=bottom]:rotate-45 data-[side=left]:-right-1.5 data-[side=left]:rotate-135 data-[side=right]:-left-1.5 data-[side=right]:rotate-315 data-[side=top]:-bottom-1.5 data-[side=top]:rotate-225" />
                    <PopoverBase.Viewport className="py-vertical-xs px-horizontal-sm max-h-[80vh] max-w-md">
                        {props.children}
                    </PopoverBase.Viewport>
                </PopoverBase.Popup>
            </PopoverBase.Positioner>
        </PopoverBase.Portal>
    );
}
