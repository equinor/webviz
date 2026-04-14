import type React from "react";

import { Close } from "@mui/icons-material";

import { DenseIconButton } from "@lib/components/DenseIconButton";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import type { CategoricalReadout } from "../../Readout/types";

import { ReadoutList } from "../../Readout/ReadoutList";

export type PositionedReadoutBoxProps = {
    readouts: CategoricalReadout[];
    // TODO: As a future task, it'd be cool to make it so the user is free to drag the readout anywhere within the bounds of the viewport
    // container: VirtualElement;
    // onChangePosition?: (newPosition: { x: number; y: number }) => void;
    position: { x: number; y: number };
    visible?: boolean;
    stale?: boolean;
    interactable?: boolean;
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
            <TooltipContent readouts={readouts} stale={props.stale} onClose={props.onClose} />
        </div>
    );
}

function TooltipContent(props: { readouts: CategoricalReadout[]; stale?: boolean; onClose?: () => void }) {
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
