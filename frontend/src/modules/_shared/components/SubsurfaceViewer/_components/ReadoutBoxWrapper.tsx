import React from "react";

import type { PickingInfoPerView } from "@webviz/subsurface-viewer/dist/hooks/useMultiViewPicking";
import { isEqual } from "lodash";

import { ReadoutBox, type ReadoutItem } from "@modules/_shared/components/ReadoutBox";

// Needs extra distance for the left side; this avoids overlapping with legend elements
const READOUT_EDGE_DISTANCE_REM = { left: 6, right: 0 };

export type ViewportPickingInfo = PickingInfoPerView extends Record<any, infer V> ? V : never;

export type ReadoutBoxWrapperProps = {
    viewportPickInfo: ViewportPickingInfo;
    verticalScale?: number;
    maxNumItems?: number;
    visible?: boolean;
    compact?: boolean;
};

export function ReadoutBoxWrapper(props: ReadoutBoxWrapperProps): React.ReactNode {
    const [infoData, setInfoData] = React.useState<ReadoutItem[]>([]);
    const [prevLayerPickInfo, setPrevLayerPickInfo] = React.useState<ViewportPickingInfo | null>(null);

    if (!props.visible) {
        return null;
    }

    if (!isEqual(props.viewportPickInfo, prevLayerPickInfo)) {
        setPrevLayerPickInfo(props.viewportPickInfo);
        const newReadoutItems: ReadoutItem[] = [];

        const coordinates = props.viewportPickInfo.coordinates;
        const layerPickInfoArray = props.viewportPickInfo.layerPickingInfo;

        if (!coordinates || coordinates.length < 2) {
            setInfoData([]);
            return;
        }

        for (const layerPickInfo of layerPickInfoArray) {
            const layerName = layerPickInfo.layerName;
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

    if (!props.visible) {
        return null;
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
