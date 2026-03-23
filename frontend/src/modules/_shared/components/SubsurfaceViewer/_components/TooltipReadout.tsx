// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- unused

import React from "react";

import { Close } from "@mui/icons-material";
import { throttle } from "lodash";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { Popover } from "@lib/components/Popover";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ReadoutList } from "../../Readout/ReadoutList";
import type { CategoricalReadout } from "../../Readout/types";

export type TooltipReadoutProps = {
    readouts: CategoricalReadout[];
    position: { x: number; y: number };
    visible?: boolean;
    stale?: boolean;
    interactable?: boolean;
    onClose: () => void;
};

function TooltipContent(props: { readouts: CategoricalReadout[]; stale?: boolean }) {
    // Depending on the readouts, we'll either have a group or item name element at the top.

    return (
        <ReadoutList
            className={resolveClassNames("transition-opacity duration-500", {
                "opacity-40": props.stale,
            })}
            readouts={props.readouts}
            firstTitleAdornment={
                <DenseIconButton className="text-sm -mr-2 ml-auto" onClick={props.onClose}>
                    <Close fontSize="inherit" />
                </DenseIconButton>
            }
        />
    );
}

export function TooltipReadout(props: TooltipReadoutProps): React.ReactNode {
    const { readouts, position, visible = true } = props;

    const [x, setX] = React.useState(position.x);
    const [y, setY] = React.useState(position.y);

    // Wrap the actual debouncer to get a stable reference. Only recreated if delay changes
    const throttledX = React.useMemo(() => throttle(setX, 50), []);

    // Wrap the actual debouncer to get a stable reference. Only recreated if delay changes
    const throttledY = React.useMemo(() => throttle(setY, 50), []);

    if (!visible || !position || readouts.length === 0) {
        return null;
    }

    if (x !== position.x) throttledX(position.x);
    if (y !== position.y) throttledY(position.y);

    return (
        <Popover
            side="top"
            align="center"
            open
            onOpenChange={(v, e) => {
                if (v) return;

                if (e.reason === "close-press" || e.reason === "escape-key") props.onClose();
            }}
            disableInteraction={!props.interactable}
            content={<TooltipContent readouts={readouts} stale={props.stale} />}
            renderTrigger={
                <div
                    className="absolute pointer-events-none bg-purple-600"
                    style={{
                        width: "4px",
                        height: "4px",

                        top: position.y - 2,
                        left: position.x - 2,
                    }}
                />
            }
        />
    );
}
