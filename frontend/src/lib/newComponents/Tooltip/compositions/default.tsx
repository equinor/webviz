import React from "react";

import { pick } from "lodash";

import type { TooltipPopupProps, TooltipRootProps, TooltipTriggerProps } from "..";
import { Tooltip } from "..";

const ROOT_PROPS = ["actionsRef", "open", "onOpenChange", "disabled"] as (keyof TooltipRootProps)[];
const TRIGGER_PROPS = ["delay"] as (keyof TooltipTriggerProps)[];
const POPUP_PROPS = ["align", "side"] as (keyof TooltipPopupProps)[];

export type DefaultTooltipProps = {
    content: string | undefined;
    children: React.ReactNode;
} & Pick<TooltipRootProps, (typeof ROOT_PROPS)[number]> &
    Pick<TooltipTriggerProps, (typeof TRIGGER_PROPS)[number]> &
    Pick<TooltipPopupProps, (typeof POPUP_PROPS)[number]>;

function DefaultTooltipComponent(props: DefaultTooltipProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const rootProps = pick(props, ...ROOT_PROPS);
    const triggerProps = pick(props, ...TRIGGER_PROPS);
    const popupProps = pick(props, ...POPUP_PROPS);

    const disabled = props.disabled ?? !props.content;

    return (
        <Tooltip.Root {...rootProps} disabled={disabled}>
            <Tooltip.Trigger {...triggerProps}>{props.children}</Tooltip.Trigger>
            <Tooltip.Popup {...popupProps} ref={ref}>
                {props.content}
            </Tooltip.Popup>
        </Tooltip.Root>
    );
}

export const DefaultTooltip = React.forwardRef<HTMLDivElement, DefaultTooltipProps>(DefaultTooltipComponent);
