import React from "react";

import type { PickingInfo } from "@deck.gl/core";
import type { WellFeature } from "@webviz/subsurface-viewer";
import type { PickingInfoPerView } from "@webviz/subsurface-viewer/dist/hooks/useMultiViewPicking";

import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import { AdjustedWellsLayer } from "@modules/_shared/customDeckGlLayers/AdjustedWellsLayer";
import {
    getReadoutFromSubsurfacePick,
    type LayerPickInfoWithReadout,
} from "@modules/_shared/utils/subsurfaceViewerLayers";

import { type CategoricalReadout } from "../../Readout/types";

import { PositionedReadoutBox } from "./PositionedReadoutBox";

// Needs extra distance for the left side; this avoids overlapping with legend elements
const READOUT_EDGE_DISTANCE_REM = { left: 6, right: 0, bottom: 2.5 };

// Infering the record type from PickingInfoPerView since it's not exported anywhere
export type ViewportPickingInfo = PickingInfoPerView extends Record<any, infer V> ? V : never;

export type ReadoutBoxWrapperProps = {
    picks: PickingInfo[];
    interactable?: boolean;
    maxNumItems?: number; // TODO: Show a clickable
    visible?: boolean;
    compact?: boolean;
    stale?: boolean;
    verticalScale?: number;
    onClose?: () => void;
};

export function ReadoutBoxWrapper(props: ReadoutBoxWrapperProps): React.ReactNode {
    const readouts = React.useMemo<CategoricalReadout[]>(() => {
        const readouts = [];

        for (const pick of props.picks) {
            // TODO: First refer to DPF for layer specific readouts, instead of manually per layer here
            if (pick.layer instanceof AdjustedWellsLayer) {
                const infoWithReadout = pick as LayerPickInfoWithReadout<WellFeature>;
                if (infoWithReadout.readout) readouts.push(infoWithReadout.readout);
            } else {
                const extractedReadout = getReadoutFromSubsurfacePick(pick);
                if (extractedReadout) readouts.push(extractedReadout);
            }
        }

        return readouts;
    }, [props.picks]);

    if (!props.visible && !props.picks.length) return null;

    return (
        <PositionedReadoutBox
            interactable={true}
            readouts={readouts}
            stale={props.stale}
            position={{
                x: convertRemToPixels(READOUT_EDGE_DISTANCE_REM.right),
                y: convertRemToPixels(READOUT_EDGE_DISTANCE_REM.bottom),
            }}
            onClose={props.onClose}
        />
    );
}
