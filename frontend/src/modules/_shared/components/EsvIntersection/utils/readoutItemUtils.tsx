import {
    Casing,
    Cement,
    Completion,
    HoleSize,
    Layer,
    PAndA,
    Perforation,
    SchematicData,
} from "@equinor/esv-intersection";
import { ijkFromCellIndex } from "@framework/utils/cellIndexUtils";

import { getColorFromLayerData } from "./intersectionConversion";
import {
    isCalloutCanvasLayer,
    isPolylineIntersectionLayer,
    isSchematicLayer,
    isSeismicCanvasLayer,
    isSeismicLayer,
    isStatisticalFanchartsCanvasLayer,
    isSurfaceLayer,
    isWellborepathLayer,
} from "./layers";

import { ReadoutItem as GenericReadoutItem, InfoItem } from "../../ReadoutBox";
import { AdditionalInformationItem, AdditionalInformationType, ReadoutItem } from "../types/types";

export function getLabelFromLayerData(readoutItem: ReadoutItem): string {
    const layer = readoutItem.layer;
    if (isSurfaceLayer(layer) && layer.data) {
        return layer.data.lines[readoutItem.index].label;
    }

    if (isPolylineIntersectionLayer(layer) && layer.data) {
        return `Intersection section ${readoutItem.index + 1}`;
    }

    if (isStatisticalFanchartsCanvasLayer(layer) && layer.data) {
        return layer.data.fancharts[readoutItem.index].label ?? "Fanchart";
    }

    if (isCalloutCanvasLayer(layer) && layer.data) {
        return layer.data[readoutItem.index].title;
    }

    if (isWellborepathLayer(layer)) {
        return "Wellborepath";
    }

    if (isSchematicLayer(layer)) {
        switch (readoutItem.schematicType) {
            case "casings":
                return "Casing";
            case "cements":
                return "Cement";
            case "completion":
                return "Completion";
            case "holeSizes":
                return "Hole size";
            case "pAndA":
                return "P&A";
            case "perforations":
                return "Perforation";
            case "symbols":
                return "Symbol";
        }
    }

    if (isSeismicCanvasLayer(layer)) {
        return "Seismic";
    }

    if (isSeismicLayer(layer)) {
        return "Seismic";
    }

    return "Unknown";
}

type ArrayElement<T extends unknown[]> = T extends readonly (infer U)[] ? U : T;

export function makeSchematicInfo<T extends keyof Omit<SchematicData, "symbols">>(
    type: T,
    item: ArrayElement<SchematicData[T]>
): { label: string; value: string | number }[] {
    const arr: { label: string; value: string | number }[] = [];

    if (type === "casings") {
        const casing = item as Casing;
        arr.push({ label: "ID", value: casing.id });
        arr.push({ label: "Diameter", value: casing.diameter });
        arr.push({ label: "Inner diameter", value: casing.innerDiameter });
        arr.push({ label: "Has shoe", value: casing.hasShoe.toString() });
        arr.push({ label: "MD range", value: `${casing.start} - ${casing.end}` });
    } else if (type === "cements") {
        const cement = item as Cement;
        arr.push({ label: "ID", value: cement.id });
        arr.push({ label: "TOC", value: cement.toc });
    } else if (type === "completion") {
        const completion = item as Completion;
        arr.push({ label: "ID", value: completion.id });
        arr.push({ label: "Kind", value: completion.kind });
        arr.push({ label: "Diameter", value: completion.diameter });
        arr.push({ label: "MD range", value: `${completion.start} - ${completion.end}` });
    } else if (type === "holeSizes") {
        const holeSize = item as HoleSize;
        arr.push({ label: "ID", value: holeSize.id });
        arr.push({ label: "Diameter", value: holeSize.diameter });
        arr.push({ label: "MD range", value: `${holeSize.start} - ${holeSize.end}` });
    } else if (type === "pAndA") {
        const pAndA = item as PAndA;
        arr.push({ label: "ID", value: pAndA.id });
        arr.push({ label: "Kind", value: pAndA.kind });
        if (pAndA.kind === "pAndASymbol") {
            arr.push({ label: "Diameter", value: pAndA.diameter });
        }
        arr.push({ label: "MD range", value: `${pAndA.start} - ${pAndA.end}` });
    } else if (type === "perforations") {
        const perforation = item as Perforation;
        arr.push({ label: "ID", value: perforation.id });
        arr.push({ label: "Open", value: perforation.isOpen ? "Yes" : "No" });
        arr.push({ label: "Subkind", value: perforation.subKind });
        arr.push({ label: "MD range", value: `${perforation.start} - ${perforation.end}` });
    }
    return arr;
}

export function getAdditionalInformationItemsFromReadoutItem(readoutItem: ReadoutItem): AdditionalInformationItem[] {
    const items: AdditionalInformationItem[] = [];
    const layer = readoutItem.layer;

    if (isPolylineIntersectionLayer(layer) && layer.data) {
        if (readoutItem.polygonIndex) {
            const cellIndexOffset = layer.data.fenceMeshSections
                .slice(0, readoutItem.index)
                .reduce((acc, section) => acc + section.polySourceCellIndicesArr.length, 0);

            items.push({
                label: "Global polygon index",
                type: AdditionalInformationType.GLOBAL_POLYGON_INDEX,
                value: cellIndexOffset + readoutItem.polygonIndex,
            });

            const cellIndex =
                layer.data.fenceMeshSections[readoutItem.index].polySourceCellIndicesArr[readoutItem.polygonIndex];

            items.push({
                label: "IJK",
                type: AdditionalInformationType.IJK,
                value: ijkFromCellIndex(
                    cellIndex,
                    layer.data.gridDimensions.cellCountI,
                    layer.data.gridDimensions.cellCountJ
                ),
            });

            const propValue = layer.data.fenceMeshSections[readoutItem.index].polyPropsArr[readoutItem.polygonIndex];
            items.push({
                label: layer.data.propertyName,
                type: AdditionalInformationType.PROP_VALUE,
                value: propValue,
                unit: layer.data.propertyUnit,
            });
        }
    }

    if (isWellborepathLayer(layer)) {
        if (readoutItem.md) {
            items.push({
                label: "MD",
                type: AdditionalInformationType.MD,
                value: readoutItem.md,
                unit: "m",
            });
        }
    }

    if (isStatisticalFanchartsCanvasLayer(layer) && layer.data) {
        const fanchart = layer.data.fancharts[readoutItem.index];
        if (fanchart && readoutItem.points) {
            if (fanchart.visibility?.mean ?? true) {
                items.push({
                    label: "Mean",
                    type: AdditionalInformationType.MEAN,
                    value: readoutItem.points[0][1],
                    unit: "m",
                    lineStyle: {
                        color: fanchart.color ?? "black",
                    },
                });
            }

            if (fanchart.visibility?.p50 ?? true) {
                items.push({
                    label: "P50",
                    type: AdditionalInformationType.P50,
                    value: readoutItem.points[1][1],
                    unit: "m",
                    lineStyle: {
                        color: fanchart.color ?? "black",
                        dashSegments: [1, 1, 5, 1],
                    },
                });
            }

            if (fanchart.visibility?.minMax ?? true) {
                items.push({
                    label: "Min",
                    type: AdditionalInformationType.MIN,
                    value: readoutItem.points[2][1],
                    unit: "m",
                    areaStyle: {
                        fillColor: fanchart.color ?? "black",
                        alpha: 0.2,
                    },
                });

                items.push({
                    label: "Max",
                    type: AdditionalInformationType.MAX,
                    value: readoutItem.points[3][1],
                    unit: "m",
                    areaStyle: {
                        fillColor: fanchart.color ?? "black",
                        alpha: 0.2,
                    },
                });
            }

            if (fanchart.visibility?.p10p90 ?? true) {
                items.push({
                    label: "P10",
                    type: AdditionalInformationType.P10,
                    value: readoutItem.points[4][1],
                    unit: "m",
                    areaStyle: {
                        fillColor: fanchart.color ?? "black",
                        alpha: 0.6,
                    },
                });

                items.push({
                    label: "P90",
                    type: AdditionalInformationType.P90,
                    value: readoutItem.points[5][1],
                    unit: "m",
                    areaStyle: {
                        fillColor: fanchart.color ?? "black",
                        alpha: 0.6,
                    },
                });
            }
        }
    }

    if (isCalloutCanvasLayer(layer) && layer.data) {
        const md = layer.data[readoutItem.index].md;
        if (md) {
            items.push({
                label: "MD",
                type: AdditionalInformationType.MD,
                value: md,
            });
            items.push({
                label: "Wellpick",
                type: AdditionalInformationType.POI,
                value: layer.data[readoutItem.index].label,
            });
        }
    }

    if (isSchematicLayer(layer) && layer.data) {
        if (layer.data) {
            const schematicType = readoutItem.schematicType;
            if (schematicType && layer.data[schematicType] && schematicType !== "symbols") {
                const item = layer.data[schematicType][readoutItem.index];
                if (schematicType === "casings") {
                    const casing = item as Casing;
                    items.push({ label: "ID", type: AdditionalInformationType.SCHEMATIC_INFO, value: casing.id });
                    items.push({
                        label: "Diameter",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: casing.diameter,
                        unit: "m",
                    });
                    items.push({
                        label: "Inner diameter",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: casing.innerDiameter,
                        unit: "m",
                    });
                    items.push({
                        label: "Has shoe",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: casing.hasShoe,
                    });
                    items.push({
                        label: "MD range",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: [casing.start, casing.end],
                        unit: "m",
                    });
                } else if (schematicType === "cements") {
                    const cement = item as Cement;
                    items.push({ label: "ID", type: AdditionalInformationType.SCHEMATIC_INFO, value: cement.id });
                    items.push({ label: "TOC", type: AdditionalInformationType.SCHEMATIC_INFO, value: cement.toc }); // Unit?
                } else if (schematicType === "completion") {
                    const completion = item as Completion;
                    items.push({ label: "ID", type: AdditionalInformationType.SCHEMATIC_INFO, value: completion.id });
                    items.push({
                        label: "Kind",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: completion.kind,
                    });
                    items.push({
                        label: "Diameter",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: completion.diameter,
                        unit: "m",
                    });
                    items.push({
                        label: "MD range",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: [completion.start, completion.end],
                        unit: "m",
                    });
                } else if (schematicType === "holeSizes") {
                    const holeSize = item as HoleSize;
                    items.push({ label: "ID", type: AdditionalInformationType.SCHEMATIC_INFO, value: holeSize.id });
                    items.push({
                        label: "Diameter",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: holeSize.diameter,
                        unit: "m",
                    });
                    items.push({
                        label: "MD range",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: [holeSize.start, holeSize.end],
                        unit: "m",
                    });
                } else if (schematicType === "pAndA") {
                    const pAndA = item as PAndA;
                    items.push({ label: "ID", type: AdditionalInformationType.SCHEMATIC_INFO, value: pAndA.id });
                    items.push({ label: "Kind", type: AdditionalInformationType.SCHEMATIC_INFO, value: pAndA.kind });
                    if (pAndA.kind === "pAndASymbol") {
                        items.push({
                            label: "Diameter",
                            type: AdditionalInformationType.SCHEMATIC_INFO,
                            value: pAndA.diameter,
                            unit: "m",
                        });
                    }
                    items.push({
                        label: "MD range",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: [pAndA.start, pAndA.end],
                        unit: "m",
                    });
                } else if (schematicType === "perforations") {
                    const perforation = item as Perforation;
                    items.push({ label: "ID", type: AdditionalInformationType.SCHEMATIC_INFO, value: perforation.id });
                    items.push({
                        label: "Open",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: perforation.isOpen,
                    });
                    items.push({
                        label: "Subkind",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: perforation.subKind,
                    });
                    items.push({
                        label: "MD range",
                        type: AdditionalInformationType.SCHEMATIC_INFO,
                        value: [perforation.start, perforation.end],
                        unit: "m",
                    });
                }
            }
        }
    } else {
        items.push({
            label: "X",
            type: AdditionalInformationType.X,
            value: readoutItem.point[0],
            unit: "m",
        });
        items.push({
            label: "Y",
            type: AdditionalInformationType.Y,
            value: readoutItem.point[1],
            unit: "m",
        });
    }

    if (isSeismicCanvasLayer(layer)) {
        const seismicCanvasData = readoutItem.layer.getData();
        const ctx = layer.ctx;
        if (seismicCanvasData) {
            if (ctx) {
                const transformedPoint = ctx
                    .getTransform()
                    .transformPoint({ x: readoutItem.point[0], y: readoutItem.point[1] });

                const imageX = transformedPoint.x;
                const imageY = transformedPoint.y;
                const imageData = ctx.getImageData(imageX, imageY, 1, 1);

                items.push({
                    label: "R",
                    type: AdditionalInformationType.R,
                    value: imageData.data[0],
                });

                items.push({
                    label: "G",
                    type: AdditionalInformationType.G,
                    value: imageData.data[1],
                });

                items.push({
                    label: "B",
                    type: AdditionalInformationType.B,
                    value: imageData.data[2],
                });
            }
        }
    }

    if (isSeismicLayer(layer)) {
        const seismicData = layer.getData();
        if (seismicData) {
            const x = readoutItem.point[0];
            const y = readoutItem.point[1];

            const height = Math.abs(seismicData.maxFenceDepth - seismicData.minFenceDepth);
            const width = Math.abs(seismicData.maxFenceX - seismicData.minFenceX);
            const rowHeight = height / seismicData.numSamplesPerTrace;
            const columnWidth = width / seismicData.numTraces;

            const sampleNum = Math.floor((y - seismicData.minFenceDepth) / rowHeight);
            const traceNum = Math.floor((x - seismicData.minFenceX) / columnWidth);

            const index = traceNum * seismicData.numSamplesPerTrace + sampleNum;
            const value = seismicData.fenceTracesFloat32Array[index];

            items.push({
                label: seismicData.propertyName,
                type: AdditionalInformationType.PROP_VALUE,
                value: value,
                unit: seismicData.propertyUnit,
            });
        }
    }

    return items;
}

export function esvReadoutToGenericReadout(
    readout: ReadoutItem,
    index: number,
    layerIdToNameMap: Record<string, string>
): GenericReadoutItem {
    return {
        label: makeLabelFromLayer(readout.layer, layerIdToNameMap) ?? getLabelFromLayerData(readout),
        color: getColorFromLayerData(readout.layer, index),
        info: esvReadoutToInfoItems(readout),
    };
}

function makeLabelFromLayer(layer: Layer<any>, layerIdToNameMap: Record<string, string>): string | null {
    return layerIdToNameMap[layer.id];
}

function esvReadoutToInfoItems(item: ReadoutItem): InfoItem[] {
    const additionalInformation = getAdditionalInformationItemsFromReadoutItem(item);

    return additionalInformation
        .filter((el) => !(el.type === AdditionalInformationType.SCHEMATIC_INFO && el.label === "ID"))
        .map((el) => {
            return {
                name: el.label,
                unit: el.unit,
                adornment: makeAdornment(el),
                value: el.value,
            };
        });
}

function makeAdornment(item: AdditionalInformationItem): React.ReactNode {
    if (item.lineStyle) {
        return (
            <svg
                style={{
                    height: 8,
                    width: 8,
                }}
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
            >
                <line
                    x1="0"
                    y1="4"
                    x2="8"
                    y2="4"
                    style={{
                        stroke: item.lineStyle.color,
                        opacity: item.lineStyle.alpha,
                        strokeWidth: 1,
                        strokeDasharray: item.lineStyle.dashSegments?.join(","),
                    }}
                />
            </svg>
        );
    }

    if (item.areaStyle) {
        return (
            <svg
                style={{
                    height: 8,
                    width: 8,
                }}
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
            >
                <rect
                    x="0"
                    y="0"
                    width="8"
                    height="8"
                    style={{
                        fill: item.areaStyle.fillColor,
                        opacity: item.areaStyle.alpha,
                        stroke: item.areaStyle.strokeStyle?.color,
                        strokeWidth: 1,
                        strokeDasharray: item.areaStyle.strokeStyle?.dashSegments?.join(","),
                    }}
                />
            </svg>
        );
    }

    return null;
}
