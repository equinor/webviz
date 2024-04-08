import React, { ReactNode } from "react";

import { Casing, Cement, Completion, HoleSize, PAndA, Perforation, SchematicData } from "@equinor/esv-intersection";

import {
    isCalloutCanvasLayer,
    isPolylineIntersectionLayer,
    isSchematicLayer,
    isSeismicCanvasLayer,
    isStatisticalFanchartsCanvasLayer,
    isSurfaceLayer,
    isWellborepathLayer,
} from "./layers";

import { ReadoutItem } from "../types/types";

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

    return "Unknown";
}

type ArrayElement<T extends unknown[]> = T extends readonly (infer U)[] ? U : T;

export function makeSchematicInfo<T extends keyof Omit<SchematicData, "symbols">>(
    type: T,
    item: ArrayElement<SchematicData[T]>
): string[] {
    const arr: string[] = [];

    if (type === "casings") {
        const casing = item as Casing;
        arr.push(`ID: ${casing.id}`);
        arr.push(`Diameter: ${casing.diameter}`);
        arr.push(`Inner diameter: ${casing.innerDiameter}`);
        arr.push(`Has shoe: ${casing.hasShoe}`);
        arr.push(`MD range: ${casing.start} - ${casing.end}`);
    } else if (type === "cements") {
        const cement = item as Cement;
        arr.push(`ID: ${cement.id}`);
        arr.push(`TOC: ${cement.toc}`);
    } else if (type === "completion") {
        const completion = item as Completion;
        arr.push(`ID: ${completion.id}`);
        arr.push(`Kind: ${completion.kind}`);
        arr.push(`Diameter: ${completion.diameter}`);
        arr.push(`MD range: ${completion.start} - ${completion.end}`);
    } else if (type === "holeSizes") {
        const holeSize = item as HoleSize;
        arr.push(`ID: ${holeSize.id}`);
        arr.push(`Diameter: ${holeSize.diameter}`);
        arr.push(`MD range: ${holeSize.start} - ${holeSize.end}`);
    } else if (type === "pAndA") {
        const pAndA = item as PAndA;
        arr.push(`ID: ${pAndA.id}`);
        arr.push(`Kind: ${pAndA.kind}`);
        if (pAndA.kind === "pAndASymbol") {
            arr.push(`Diameter: ${pAndA.diameter}`);
        }
        arr.push(`MD range: ${pAndA.start} - ${pAndA.end}`);
    } else if (type === "perforations") {
        const perforation = item as Perforation;
        arr.push(`ID: ${perforation.id}`);
        arr.push(`Open: ${perforation.isOpen}`);
        arr.push(`Subkind: ${perforation.subKind}`);
        arr.push(`MD range: ${perforation.start} - ${perforation.end}`);
    }
    return arr;
}

export function getAdditionalInformationFromReadoutItem(readoutItem: ReadoutItem): React.ReactNode[] {
    const infoArr: ReactNode[] = [];
    const layer = readoutItem.layer;

    if (isPolylineIntersectionLayer(layer) && layer.data) {
        if (readoutItem.polygonIndex) {
            const cellIndexOffset = layer.data.fenceMeshSections
                .slice(0, readoutItem.index)
                .reduce((acc, section) => acc + section.polySourceCellIndicesArr.length, 0);
            infoArr.push(`Polygon index: ${cellIndexOffset + readoutItem.polygonIndex}`);

            const propValue = layer.data.fenceMeshSections[readoutItem.index].polyPropsArr[readoutItem.polygonIndex];
            infoArr.push(`Value: ${propValue}`);
        }
    }

    if (isWellborepathLayer(layer)) {
        infoArr.push(`MD: ${readoutItem.md?.toFixed(2)}`);
    }

    if (isStatisticalFanchartsCanvasLayer(layer) && layer.data) {
        const fanchart = layer.data.fancharts[readoutItem.index];
        if (fanchart && readoutItem.points) {
            const keys = Object.keys(fanchart.data).filter((el) => {
                if (el === "mean") {
                    return fanchart.visibility?.mean ?? true;
                }
                if (el === "min") {
                    return fanchart.visibility?.minMax ?? true;
                }
                if (el === "max") {
                    return fanchart.visibility?.minMax ?? true;
                }
                if (el === "p10") {
                    return fanchart.visibility?.p10p90 ?? true;
                }
                if (el === "p90") {
                    return fanchart.visibility?.p10p90 ?? true;
                }
                if (el === "p50") {
                    return fanchart.visibility?.p50 ?? true;
                }
                return false;
            });

            for (const [index, point] of readoutItem.points.entries()) {
                const label = keys[index];
                infoArr.push(`${label}: ${point[1].toFixed(2)}`);
            }
        }
    }

    if (isCalloutCanvasLayer(layer) && layer.data) {
        const md = layer.data[readoutItem.index].md;
        if (md) {
            infoArr.push(layer.data[readoutItem.index].label);
            infoArr.push(`MD: ${md.toFixed(2)}`);
        }
    }

    if (isSchematicLayer(layer) && layer.data) {
        if (layer.data) {
            const schematicType = readoutItem.schematicType;
            if (schematicType && layer.data[schematicType] && schematicType !== "symbols") {
                infoArr.push(...makeSchematicInfo(schematicType, layer.data[schematicType][readoutItem.index]));
            }
        }
    } else {
        infoArr.push(`(X: ${readoutItem.point[0].toFixed(2)}, Y: ${readoutItem.point[1].toFixed(2)})`);
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

                infoArr.push(`R: ${imageData.data[0]}`);
                infoArr.push(`G: ${imageData.data[1]}`);
                infoArr.push(`B: ${imageData.data[2]}`);

                infoArr.push(
                    <>
                        Color Color:{" "}
                        <span
                            className="rounded w-1 h-1 block"
                            style={{
                                backgroundColor: `rgb(${imageData.data[0]}, ${imageData.data[1]}, ${imageData.data[2]});`,
                            }}
                        />
                    </>
                );
            }
        }
    }

    return infoArr;
}
