import React from "react";

import type { ReadoutItem } from "@modules/_shared/components/ReadoutBox";
import { ReadoutBox } from "@modules/_shared/components/ReadoutBox";
import type { PickingInfoPerView } from "@webviz/subsurface-viewer/dist/hooks/useMultiViewPicking";

import { isEqual } from "lodash";

// Needs extra distance for the left side; this avoids overlapping with legend elements
const READOUT_EDGE_DISTANCE_REM = { left: 6, right: 2 };

function makePositionReadout(coordinates: number[]): ReadoutItem | null {
    if (coordinates === undefined || coordinates.length < 2) {
        return null;
    }
    return {
        label: "Position",
        info: [
            { name: "x", value: coordinates[0], unit: "m" },
            { name: "y", value: coordinates[1], unit: "m" },
        ],
    };
}

// Infering the record type from PickingInfoPerView since it's not exported anywhere
export type ViewportPickingInfo = PickingInfoPerView extends Record<any, infer V> ? V : never;

export type ReadoutBoxWrapperProps = {
    viewportPickInfo: ViewportPickingInfo;
    maxNumItems?: number;
    visible?: boolean;
    compact?: boolean;
};

export function ReadoutBoxWrapper(props: ReadoutBoxWrapperProps): React.ReactNode {
    const [infoData, setInfoData] = React.useState<ReadoutItem[]>([]);
    const [prevViewportPickInfo, setPrevViewportPickInfo] = React.useState<ViewportPickingInfo | null>(null);

    if (!props.visible) {
        return null;
    }

    if (!isEqual(props.viewportPickInfo, prevViewportPickInfo)) {
        setPrevViewportPickInfo(props.viewportPickInfo);
        const newReadoutItems: ReadoutItem[] = [];

        const coordinates = props.viewportPickInfo.coordinates;
        const layerInfoPicks = props.viewportPickInfo.layerPickingInfo;

        if (!coordinates || coordinates.length < 2) {
            setInfoData([]);
            return;
        }

        const positionReadout = makePositionReadout(coordinates);
        if (!positionReadout) {
            return;
        }
        newReadoutItems.push(positionReadout);

        for (const layerPickInfo of layerInfoPicks) {
            const layerName = layerPickInfo.layerName ?? "Unknown layer";
            const layerProps = layerPickInfo.properties;

            let layerReadout = newReadoutItems.find((item) => item.label === layerName);
            if (!layerReadout) {
                layerReadout = { label: layerName, info: [] };
                newReadoutItems.push(layerReadout);
            }

            layerReadout.info = layerProps.map((p) => ({
                name: p.name,
                value: p.value,
            }));
        }

        setInfoData(newReadoutItems);
    }

    return (
        <ReadoutBox
            noLabelColor
            readoutItems={infoData}
            edgeDistanceRem={READOUT_EDGE_DISTANCE_REM}
            compact={props.compact}
        />
    );
}
