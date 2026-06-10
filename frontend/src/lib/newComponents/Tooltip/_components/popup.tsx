import React from "react";

import type { TooltipPositionerProps as TooltipPositionerBaseProps } from "@base-ui/react/tooltip";
import { Tooltip as TooltipBase } from "@base-ui/react/tooltip";

import { PortalContainerContext } from "@lib/newComponents/_shared/contexts/portalContainerContext";
import { Paragraph } from "@lib/newComponents/Typography/compositions";

export type PopupProps = {
    side?: TooltipPositionerBaseProps["side"];
    align?: TooltipPositionerBaseProps["align"];

    children?: React.ReactNode;
};

export const Popup = React.forwardRef<HTMLDivElement, PopupProps>(function PopupComp(props, ref) {
    const portalContainer = React.useContext(PortalContainerContext);

    return (
        <TooltipBase.Portal container={portalContainer}>
            <TooltipBase.Positioner side={props.side} align={props.align} sideOffset={8} className="z-tooltip">
                <TooltipBase.Popup
                    ref={ref}
                    className="bg-floating-inverted px-sm py-xs text-neutral-strong-on-emphasis! relative rounded"
                >
                    <TooltipBase.Arrow className="floating__arrow" />
                    <Paragraph size="sm">{props.children}</Paragraph>
                </TooltipBase.Popup>
            </TooltipBase.Positioner>
        </TooltipBase.Portal>
    );
});
