import React from "react";

import { InfoItem, ReadoutBox, ReadoutItem } from "@modules/_shared/components/ReadoutBox";
import { ExtendedLayerProps, LayerPickInfo } from "@webviz/subsurface-viewer";

import { isEqual } from "lodash";

// Needs extra distance for the left side; this avoids overlapping with legend elements
const READOUT_EDGE_DISTANCE_REM = { left: 6 };

function makePositionReadout(layerPickInfo: LayerPickInfo): ReadoutItem | null {
    if (layerPickInfo.coordinate === undefined || layerPickInfo.coordinate.length < 2) {
        return null;
    }
    return {
        label: "Position",
        info: [
            {
                name: "x",
                value: layerPickInfo.coordinate[0],
                unit: "m",
            },
            {
                name: "y",
                value: layerPickInfo.coordinate[1],
                unit: "m",
            },
        ],
    };
}

// depth readout from SubsurfaceViewer is not properly working
function fixLayerDepth(item: InfoItem, verticalScale: number) {
    const { name, value } = item;

    if (name === "Depth") {
        item.value = (typeof value === "string" ? parseFloat(value) : (value as number)) / verticalScale;
    }
}

export type ReadoutBoxWrapperProps = {
    layerPickInfo: LayerPickInfo[];
    maxNumItems?: number;
    visible?: boolean;
    // Required as long as the SubsurfaceViewer is not providing correct depth readout
    verticalScale: number;
};

export function ReadoutBoxWrapper(props: ReadoutBoxWrapperProps): React.ReactNode {
    const [infoData, setInfoData] = React.useState<ReadoutItem[]>([]);
    const [prevLayerPickInfo, setPrevLayerPickInfo] = React.useState<LayerPickInfo[]>([]);

    if (!isEqual(props.layerPickInfo, prevLayerPickInfo)) {
        setPrevLayerPickInfo(props.layerPickInfo);
        const newReadoutItems: ReadoutItem[] = [];

        if (props.layerPickInfo.length === 0) {
            setInfoData([]);
            return;
        }

        const positionReadout = makePositionReadout(props.layerPickInfo[0]);
        if (!positionReadout) {
            return;
        }
        newReadoutItems.push(positionReadout);

        for (const layerPickInfo of props.layerPickInfo) {
            const layerName = (layerPickInfo.layer?.props as unknown as ExtendedLayerProps)?.name;
            const layerProps = layerPickInfo.properties;

            // pick info can have 2 types of properties that can be displayed on the info card
            // 1. defined as propertyValue, used for general layer info (now using for positional data)
            // 2. Another defined as array of property object described by type PropertyDataType

            // collecting card data for 1st type
            const zValue = (layerPickInfo as LayerPickInfo).propertyValue;
            if (zValue !== undefined) {
                const property = positionReadout.info?.find((item) => item.name === layerName);
                if (property) {
                    property.value = zValue;
                } else {
                    positionReadout.info.push({
                        name: layerName,
                        value: zValue,
                    });
                }
            }

            // collecting card data for 2nd type
            const layerReadout = newReadoutItems.find((item) => item.label === layerName);
            if (!layerProps || layerProps.length === 0) {
                continue;
            }
            if (layerReadout) {
                layerProps?.forEach((prop) => {
                    const property = layerReadout.info?.find((item) => item.name === prop.name);
                    if (property) {
                        property.value = prop.value;
                    } else {
                        layerReadout.info.push(prop);
                    }
                });
            } else {
                newReadoutItems.push({
                    label: layerName ?? "Unknown layer",
                    info: layerProps,
                });
            }
        }

        newReadoutItems.forEach(({ info }) => info.forEach((i) => fixLayerDepth(i, props.verticalScale)));

        setInfoData(newReadoutItems);
    }

    if (!props.visible) {
        return null;
    }

    return <ReadoutBox readoutItems={infoData} edgeDistanceRem={READOUT_EDGE_DISTANCE_REM} />;
}
