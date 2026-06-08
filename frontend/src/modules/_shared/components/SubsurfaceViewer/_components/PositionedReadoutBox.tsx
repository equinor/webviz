import type React from "react";

import { Close } from "@mui/icons-material";

import { DenseIconButton } from "@lib/components/DenseIconButton";
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
            className="z-9999 absolute bg-white shadow-md border border-gray-200 rounded-sm transition-opacity px-3 py-2 select-text"
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
                <DenseIconButton
                    className={resolveClassNames("text-sm -mr-2 ml-auto", {
                        invisible: !props.pinned,
                    })}
                    onClick={props.onClose}
                >
                    <Close fontSize="inherit" />
                </DenseIconButton>
            }
        />
    );
}
