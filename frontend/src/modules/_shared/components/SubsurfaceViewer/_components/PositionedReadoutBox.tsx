import type React from "react";

import { Close } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ReadoutList } from "../../Readout/ReadoutList";
import type { CategoricalReadout } from "../../Readout/types";

export type PositionedReadoutBoxProps = {
    readouts: CategoricalReadout[];
    position: { x: number; y: number };
    visible?: boolean;
    stale?: boolean;
    interactable?: boolean;
    pinned?: boolean;
    onClose?: () => void;
};

export function PositionedReadoutBox(props: PositionedReadoutBoxProps): React.ReactNode {
    const { readouts, position, visible = true } = props;

    if (!visible) return null;
    return (
        <div
            className="bg-surface border-neutral-subtle px-xs py-2xs absolute z-9999 rounded border shadow-md transition-opacity select-text"
            style={{
                bottom: position.y - 2,
                right: position.x - 2,
            }}
        >
            <TooltipContent pinned={props.pinned} readouts={readouts} stale={props.stale} onClose={props.onClose} />
        </div>
    );
}

function TooltipContent(props: {
    pinned?: boolean;
    readouts: CategoricalReadout[];
    stale?: boolean;
    onClose?: () => void;
}) {
    return (
        <ReadoutList
            className={resolveClassNames("transition-opacity duration-500", {
                "opacity-40": props.stale,
            })}
            readouts={props.readouts}
            firstTitleAdornment={
                <Button
                    layoutClassName={resolveClassNames("-mr-2xs text-body-sm ml-auto", {
                        invisible: !props.pinned,
                    })}
                    onClick={props.onClose}
                    variant="ghost"
                    size="small"
                    tone="neutral"
                    iconOnly
                >
                    <Close fontSize="inherit" />
                </Button>
            }
        />
    );
}
