import React from "react";

import { ExtendedLayerProps, LayerPickInfo, PropertyDataType } from "@webviz/subsurface-viewer";

import { isEqual } from "lodash";

type ReadoutInfo = {
    label: string;
    properties?: PropertyDataType[];
};

function makePositionInfo(layerPickInfo: LayerPickInfo): ReadoutInfo | null {
    if (layerPickInfo.coordinate === undefined || layerPickInfo.coordinate.length < 2) {
        return null;
    }
    return {
        label: "Position",
        properties: [
            {
                name: "x",
                value: layerPickInfo.coordinate[0].toFixed(2).toString() + " m",
            },
            {
                name: "y",
                value: layerPickInfo.coordinate[1].toFixed(2).toString() + " m",
            },
        ],
    };
}

function makeAdditionalInformation(item: ReadoutInfo, verticalScale: number): React.ReactNode {
    if (!item.properties) {
        return null;
    }

    function formatValue(value: number | string): string {
        if (typeof value === "number") {
            return value.toFixed(2);
        }
        return value.toString();
    }

    // depth readout from SubsurfaceViewer is not properly working
    return item.properties.map((el, index) => {
        return (
            <div className="table-row" key={index}>
                <div className="table-cell w-32">{el.name}:</div>
                <div className="table-cell">
                    {el.name === "Depth"
                        ? formatValue((typeof el.value === "string" ? parseFloat(el.value) : el.value) / verticalScale)
                        : formatValue(el.value)}
                </div>
            </div>
        );
    });
}

export type ReadoutBoxProps = {
    layerPickInfo: LayerPickInfo[];
    maxNumItems?: number;
    visible?: boolean;
    // Required as long as the SubsurfaceViewer is not providing correct depth readout
    verticalScale: number;
};

export function ReadoutBox(props: ReadoutBoxProps): React.ReactNode {
    const [infoData, setInfoData] = React.useState<ReadoutInfo[]>([]);
    const [prevLayerPickInfo, setPrevLayerPickInfo] = React.useState<LayerPickInfo[]>([]);

    if (!isEqual(props.layerPickInfo, prevLayerPickInfo)) {
        setPrevLayerPickInfo(props.layerPickInfo);
        const newInfoData: ReadoutInfo[] = [];

        if (props.layerPickInfo.length === 0) {
            setInfoData([]);
            return;
        }

        const positionInfo = makePositionInfo(props.layerPickInfo[0]);
        if (!positionInfo) {
            return;
        }
        newInfoData.push(positionInfo);

        for (const layerPickInfo of props.layerPickInfo) {
            const layerName = (layerPickInfo.layer?.props as unknown as ExtendedLayerProps)?.name;
            const layerProps = layerPickInfo.properties;

            // pick info can have 2 types of properties that can be displayed on the info card
            // 1. defined as propertyValue, used for general layer info (now using for positional data)
            // 2. Another defined as array of property object described by type PropertyDataType

            // collecting card data for 1st type
            const zValue = (layerPickInfo as LayerPickInfo).propertyValue;
            if (zValue !== undefined) {
                const property = positionInfo.properties?.find((item) => item.name === layerName);
                if (property) {
                    property.value = zValue;
                } else {
                    positionInfo.properties?.push({
                        name: layerName,
                        value: zValue,
                    });
                }
            }

            // collecting card data for 2nd type
            const layer = newInfoData.find((item) => item.label === layerName);
            if (!layerProps || layerProps.length === 0) {
                continue;
            }
            if (layer) {
                layerProps?.forEach((prop) => {
                    const property = layer.properties?.find((item) => item.name === prop.name);
                    if (property) {
                        property.value = prop.value;
                    } else {
                        layer.properties?.push(prop);
                    }
                });
            } else {
                newInfoData.push({
                    label: layerName ?? "Unknown layer",
                    properties: layerProps,
                });
            }
        }

        setInfoData(newInfoData);
    }

    if (!props.visible) {
        return null;
    }

    return (
        <div className="absolute rounded border border-neutral-300 bottom-10 right-12 bg-white bg-opacity-75 p-2 flex flex-col gap-2 text-sm z-50 w-60 pointer-events-none backdrop-blur-sm">
            {infoData.map((el, index) => {
                if (index < (props.maxNumItems ?? 3)) {
                    return (
                        <div key={index} className="table">
                            <div className="table-row">
                                <div className="table-cell font-bold">{el.label}</div>
                            </div>
                            {makeAdditionalInformation(el, props.verticalScale)}
                        </div>
                    );
                }
            })}
            {infoData.length > (props.maxNumItems ?? 3) && (
                <div className="flex items-center gap-2">...and {infoData.length - (props.maxNumItems ?? 3)} more</div>
            )}
        </div>
    );
}
