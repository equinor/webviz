import type React from "react";

import { Info as InfoIcon } from "@mui/icons-material";

import type { PopoverPopupProps } from "@lib/components/Popover";
import { Popover } from "@lib/components/Popover";

export type InfoProps = {
    /** Optional title rendered at the top of the popover. */
    title?: React.ReactNode;
    /** Which side of the trigger to display the popover. */
    side?: PopoverPopupProps["side"];
    /** Alignment of the popover relative to the trigger. */
    align?: PopoverPopupProps["align"];
    /** The content rendered inside the popover. */
    children: React.ReactNode;
};

export function Info(props: InfoProps): React.ReactNode {
    return (
        <Popover.Root>
            <Popover.Trigger size="small" tone="neutral" variant="ghost" iconOnly round>
                <InfoIcon fontSize="small" />
            </Popover.Trigger>
            <Popover.Popup side={props.side} align={props.align} sticky={false}>
                {props.children}
            </Popover.Popup>
        </Popover.Root>
    );
}
