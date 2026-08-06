import React from "react";

import type { TooltipPositionerProps as TooltipPositionerBaseProps } from "@base-ui/react/tooltip";
import { Tooltip as TooltipBase } from "@base-ui/react/tooltip";

import { PortalContainerContext } from "@lib/components/_shared/contexts/portalContainerContext";
import { Paragraph } from "@lib/components/Typography/compositions";

import { TooltipProviderContext } from "./provider";

export type PopupProps = {
    /** Side of the trigger element where the tooltip appears. */
    side?: TooltipPositionerBaseProps["side"];
    /** Alignment of the tooltip relative to the trigger. */
    align?: TooltipPositionerBaseProps["align"];
    /** The tooltip text content. */
    children?: React.ReactNode;
};

export const Popup = React.forwardRef<HTMLDivElement, PopupProps>(function PopupComp(props, ref) {
    const portalContainer = React.useContext(PortalContainerContext);
    const providerContext = React.useContext(TooltipProviderContext);

    return (
        <TooltipBase.Portal container={portalContainer}>
            <TooltipBase.Positioner
                className="z-tooltip"
                side={props.side ?? providerContext?.side}
                align={props.align ?? providerContext?.align}
                sideOffset={8}
            >
                <TooltipBase.Popup
                    ref={ref}
                    className="bg-floating-inverted px-sm py-xs text-neutral-strong-on-emphasis! relative rounded"
                >
                    <TooltipBase.Arrow className="floating__arrow" />
                    <Paragraph size="sm" layoutClassName="whitespace-pre-line">
                        {props.children}
                    </Paragraph>
                </TooltipBase.Popup>
            </TooltipBase.Positioner>
        </TooltipBase.Portal>
    );
});
