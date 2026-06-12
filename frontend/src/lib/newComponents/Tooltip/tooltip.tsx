import React from "react";

import { pick } from "lodash";

import type { PopupProps } from "./_components/popup";
import { Popup } from "./_components/popup";
import type { RootProps } from "./_components/root";
import { Root } from "./_components/root";
import type { TriggerProps } from "./_components/trigger";
import { Trigger } from "./_components/trigger";

const ROOT_PROPS = ["actionsRef", "open", "onOpenChange", "disabled"] as (keyof RootProps)[];
const TRIGGER_PROPS = ["delay"] as (keyof TriggerProps)[];
const POPUP_PROPS = ["align", "side"] as (keyof PopupProps)[];

export type DefaultTooltipProps = {
    content: string | undefined;
    children: React.ReactNode;
} & Pick<RootProps, (typeof ROOT_PROPS)[number]> &
    Pick<TriggerProps, (typeof TRIGGER_PROPS)[number]> &
    Pick<PopupProps, (typeof POPUP_PROPS)[number]>;

function TooltipComp(props: DefaultTooltipProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const rootProps = pick(props, ...ROOT_PROPS);
    const triggerProps = pick(props, ...TRIGGER_PROPS);
    const popupProps = pick(props, ...POPUP_PROPS);

    const disabled = props.disabled ?? !props.content;

    return (
        <Root {...rootProps} disabled={disabled}>
            <Trigger {...triggerProps}>{props.children}</Trigger>
            <Popup {...popupProps} ref={ref}>
                {props.content}
            </Popup>
        </Root>
    );
}

export const Tooltip = React.forwardRef<HTMLDivElement, DefaultTooltipProps>(TooltipComp);
