import React from "react";

import { Layer } from "@equinor/esv-intersection";

import { AdditionalInformationItem, AdditionalInformationType, ReadoutItem } from "../types";
import { getColorFromLayerData } from "../utils/intersectionConversion";
import { getAdditionalInformationItemsFromReadoutItem, getLabelFromLayerData } from "../utils/readoutItemUtils";

export type ReadoutBoxProps = {
    readoutItems: ReadoutItem[];
    maxNumItems?: number;
    makeLabelFromLayer?: (layer: Layer<any>) => string | null;
};

type InfoItem = {
    adornment: React.ReactNode;
    label: React.ReactNode;
    value: string;
    unit?: string;
};

function formatValue(value: number | string): string {
    if (typeof value === "number") {
        return (+value.toFixed(2)).toString();
    }
    return value.toString();
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

function convertAdditionalInformationItemToInfoItem(item: AdditionalInformationItem): InfoItem {
    let formattedValue: string = "";
    if (item.value instanceof Array) {
        if (item.value.length === 3) {
            formattedValue = item.value.map((el) => formatValue(el)).join(", ");
        } else {
            formattedValue = item.value.map((el) => formatValue(el)).join(" - ");
        }
    }
    if (typeof item.value === "number" || typeof item.value === "string") {
        formattedValue = formatValue(item.value);
    }

    return {
        label: item.label,
        value: formattedValue,
        unit: item.unit,
        adornment: makeAdornment(item),
    };
}

function makeAdditionalInformation(item: ReadoutItem): InfoItem[] {
    const additionalInformation = getAdditionalInformationItemsFromReadoutItem(item);

    return additionalInformation
        .filter((el) => !(el.type === AdditionalInformationType.SCHEMATIC_INFO && el.label === "ID"))
        .map((el) => {
            return convertAdditionalInformationItemToInfoItem(el);
        });
}

function convertAdditionalInformationToHtml(items: InfoItem[]): React.ReactNode {
    return items.map((el, index) => {
        return (
            <div className="table-row" key={index}>
                <div className="table-cell w-4 align-middle">{el.adornment}</div>
                <div className="table-cell w-32 align-middle">{el.label}:</div>
                <div className="table-cell align-middle">{el.value}</div>
                {el.unit && <div className="table-cell text-right align-middle">{el.unit}</div>}
            </div>
        );
    });
}

export function ReadoutBox(props: ReadoutBoxProps): React.ReactNode {
    if (props.readoutItems.length === 0) {
        return null;
    }

    const sortedReadoutItems = props.readoutItems.sort((a, b) => {
        return b.layer.order - a.layer.order;
    });

    function makeLabel(item: ReadoutItem): string {
        if (!props.makeLabelFromLayer) {
            return getLabelFromLayerData(item);
        }
        return props.makeLabelFromLayer(item.layer) ?? getLabelFromLayerData(item);
    }

    return (
        <div className="absolute flex flex-col gap-2 rounded border border-neutral-300 bottom-10 right-12 bg-white bg-opacity-75 p-2 text-sm z-50 w-60 pointer-events-none backdrop-blur-sm">
            {sortedReadoutItems.map((item, index) => {
                if (index < (props.maxNumItems ?? 3)) {
                    return (
                        <React.Fragment key={`${item.layer.id}-${item.index}`}>
                            <div className="flex gap-2 font-bold items-center">
                                <div
                                    className="rounded-full w-3 h-3 border border-slate-500"
                                    style={{ backgroundColor: getColorFromLayerData(item.layer, item.index) }}
                                />
                                {makeLabel(item)}
                            </div>
                            <div className="table">
                                {convertAdditionalInformationToHtml(makeAdditionalInformation(item))}
                            </div>
                        </React.Fragment>
                    );
                }
            })}
            {props.readoutItems.length > (props.maxNumItems ?? 3) && (
                <div className="flex items-center gap-2">
                    ...and {props.readoutItems.length - (props.maxNumItems ?? 3)} more
                </div>
            )}
        </div>
    );
}
