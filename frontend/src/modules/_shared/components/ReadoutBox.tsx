import React from "react";

import { useStableProp } from "@lib/hooks/useStableProp";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";

import _ from "lodash";

export type ReadoutItem = {
    label: string;
    info: InfoItem[];
    color?: string;
};

export type InfoItem = {
    adornment?: React.ReactNode;
    name: React.ReactNode;
    value: string | number | boolean | number[];
    unit?: string;
};

// Top not included, as it's not relevant
type EdgeDistance = { left: number; right: number; bottom: number };
type PartialEdgeDistance = Partial<EdgeDistance>;

export type ReadoutBoxProps = {
    /** A list of readouts to display */
    readoutItems: ReadoutItem[];
    /** The max number of items to show. Excess items are hidden by a "... and X more." */
    maxNumItems?: number;
    /** Disables the small colored badge next to the item labels */
    noLabelColor?: boolean;
    /** Disables the mouse-avoiding behaviour */
    flipDisabled?: boolean;
    /** The distance between the box and the edges of the parent container. Give a single number for equal distance on all sides */
    edgeDistanceRem?: number | PartialEdgeDistance;
};

export function ReadoutBox(props: ReadoutBoxProps): React.ReactNode {
    const maxNumItemsOrDefault = props.maxNumItems ?? 3;

    const [flipped, setFlipped] = React.useState<boolean>(false);
    const [stableEdgeDistanceRem] = useStableProp(props.edgeDistanceRem);
    const edgeDistance = React.useMemo(() => computeEdgeDistance(stableEdgeDistanceRem), [stableEdgeDistanceRem]);
    const readoutRoot = React.useRef<HTMLDivElement>(null);

    React.useEffect(
        function addListenersForFlip() {
            if (props.flipDisabled) return;

            function maybeFlipBox(evt: MouseEvent) {
                if (!readoutRoot.current) return;

                const offsetParent = readoutRoot.current.offsetParent;
                if (!offsetParent) return; // Not floating, I believe

                const parentRect = offsetParent.getBoundingClientRect();
                const { top, bottom, width } = readoutRoot.current.getBoundingClientRect();

                // If above, or below, it's guaranteed to fit
                if (evt.clientY < top || evt.clientY > bottom) {
                    if (flipped) setFlipped(false);
                    return;
                }

                const prefferredRight = parentRect.right - edgeDistance.right;
                const prefferredLeft = parentRect.right - width - edgeDistance.right;

                if (evt.clientX < prefferredLeft || evt.clientX > prefferredRight) {
                    if (flipped) setFlipped(false);
                } else {
                    if (!flipped) setFlipped(true);
                }
            }

            document.addEventListener("mousemove", maybeFlipBox);
            return () => document.removeEventListener("mousemove", maybeFlipBox);
        },
        [props.flipDisabled, flipped, edgeDistance]
    );

    // Guard. If there are no readout items, don't render the box
    if (props.readoutItems.length === 0) return null;

    const boxPositionStyle: React.CSSProperties = { bottom: edgeDistance.bottom + "px" };

    if (flipped) boxPositionStyle.left = edgeDistance.left + "px";
    else boxPositionStyle.right = edgeDistance.right + "px";

    return (
        <div
            ref={readoutRoot}
            className="absolute z-50 w-60 flex flex-col gap-2 p-2 text-sm rounded border border-neutral-300 bg-white bg-opacity-75 backdrop-blur-sm pointer-events-none"
            style={boxPositionStyle}
        >
            {props.readoutItems.map((item, idx) => {
                if (idx < maxNumItemsOrDefault) {
                    return (
                        <React.Fragment key={idx}>
                            <div className="flex gap-2 font-bold items-center">
                                {!props.noLabelColor && (
                                    <div
                                        className="rounded-full w-3 h-3 border border-slate-500"
                                        style={{ backgroundColor: item.color }}
                                    />
                                )}
                                <span className="block">{item.label}</span>
                            </div>

                            {item.info && item.info.map((i: InfoItem, idx: number) => <InfoItem key={idx} {...i} />)}
                        </React.Fragment>
                    );
                }
            })}
            {props.readoutItems.length > maxNumItemsOrDefault && (
                <div className="flex items-center gap-2">
                    ...and {props.readoutItems.length - maxNumItemsOrDefault} more
                </div>
            )}
        </div>
    );
}

function InfoItem(props: InfoItem): React.ReactNode {
    return (
        <div className="table-row">
            <div className="table-cell w-4 align-middle">{props.adornment}</div>
            <div className="table-cell w-32 align-middle">{props.name}:</div>
            <div className="table-cell align-middle">{makeFormatedInfoValue(props.value)}</div>
            {props.unit && <div className="table-cell text-right align-middle">{props.unit}</div>}
        </div>
    );
}

const DEFAULT_EDGE_DISTANCE: EdgeDistance = { left: 3, right: 3, bottom: 2.5 };

function computeEdgeDistance(edgeDistanceProp?: number | PartialEdgeDistance): EdgeDistance {
    let edgesRem: EdgeDistance;

    if (typeof edgeDistanceProp === "number") {
        edgesRem = { left: edgeDistanceProp, right: edgeDistanceProp, bottom: edgeDistanceProp };
    } else {
        edgesRem = _.defaults({}, edgeDistanceProp ?? {}, DEFAULT_EDGE_DISTANCE);
    }
    return _.mapValues(edgesRem, convertRemToPixels);
}

function makeFormatedInfoValue(value: string | number | boolean | number[]): string {
    let formattedValue = "";

    if (value instanceof Array) {
        if (value.length === 3) {
            formattedValue = value.map((el) => formatValue(el)).join(", ");
        } else {
            formattedValue = value.map((el) => formatValue(el)).join(" - ");
        }
    }
    if (typeof value === "number" || typeof value === "string") {
        formattedValue = formatValue(value);
    }

    return formattedValue;
}

function formatValue(value: number | string): string {
    if (typeof value === "number") {
        return (+value.toFixed(2)).toString();
    }
    return value.toString();
}
