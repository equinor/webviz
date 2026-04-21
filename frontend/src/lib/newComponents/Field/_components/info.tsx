import type React from "react";

import { Info as InfoIcon } from "@mui/icons-material";

import type { PopoverPopupProps } from "@lib/newComponents/Popover";
import { Popover } from "@lib/newComponents/Popover";

export type InfoProps = {
    title?: React.ReactNode;
    side?: PopoverPopupProps["side"];
    align?: PopoverPopupProps["align"];
    children: React.ReactNode;
};

export function Info(props: InfoProps): React.ReactNode {
    return (
        <Popover.Root>
            <Popover.Trigger size="small" tone="neutral" variant="text" iconOnly round>
                <InfoIcon fontSize="small" />
            </Popover.Trigger>
            <Popover.Popup side={props.side} align={props.align}>
                {props.children}
            </Popover.Popup>
        </Popover.Root>
    );
}
