import React from "react";

import { Close } from "@mui/icons-material";
import _ from "lodash";

import { useStableProp } from "@lib/hooks/useStableProp";
import { Button } from "@lib/newComponents/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";

import { formatNumber } from "../utils/numberFormatting";

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
    compact?: boolean;
    /** A callback for when the box is closed - this will automatically show a cross */
    onClose?: () => void;
    /** Gray out the text to indicate stale data */
    textGrayedOut?: boolean;
};

export function ReadoutBox(props: ReadoutBoxProps): React.ReactNode {
    const maxNumItemsOrDefault = props.maxNumItems ?? 3;
    const visibleReadoutItems = _.take(props.readoutItems, maxNumItemsOrDefault);

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
                    setFlipped(false);
                    return;
                }

                const preferredRight = parentRect.right - edgeDistance.right;
                const preferredLeft = parentRect.right - width - edgeDistance.right;

                if (evt.clientX < preferredLeft || evt.clientX > preferredRight) {
                    setFlipped(false);
                } else {
                    setFlipped(true);
                }
            }

            document.addEventListener("mousemove", maybeFlipBox);

            return function removeFlipListeners() {
                document.removeEventListener("mousemove", maybeFlipBox);
            };
        },
        [props.flipDisabled, edgeDistance],
    );

    // Guard. If there are no readout items, don't render the box
    if (props.readoutItems.length === 0) return null;

    const boxPositionStyle: React.CSSProperties = { bottom: edgeDistance.bottom + "px" };

    if (flipped) boxPositionStyle.left = edgeDistance.left + "px";
    else boxPositionStyle.right = edgeDistance.right + "px";

    return (
        <div
            ref={readoutRoot}
            className={resolveClassNames(
                "z-elevated border-neutral-subtle bg-surface/75 pointer-events-none absolute grid items-center rounded-sm border backdrop-blur-xs",
                {
                    "px-horizontal-2xs py-vertical-3xs text-body-sm w-72 gap-2": !props.compact,
                    "gap-x-horizontal-2xs gap-y-vertical-2xs px-horizontal-2xs py-vertical-2xs text-body-xs min-w-52":
                        props.compact,
                    "text-neutral-subtle": props.textGrayedOut,
                },
            )}
            style={{
                ...boxPositionStyle,
                gridTemplateColumns: "1rem auto 1fr auto",
            }}
        >
            {props.onClose && (
                <Button
                    onClick={props.onClose}
                    layoutClassName="pointer-events-auto absolute top-0.5 right-0.5"
                    title="Clear readout"
                    variant="ghost"
                    size="small"
                    tone="neutral"
                    iconOnly
                >
                    <Close fontSize="inherit" />
                </Button>
            )}
            {visibleReadoutItems.map((item, idx) => (
                <React.Fragment key={idx}>
                    <InfoLabel item={item} noLabelColor={props.noLabelColor} />

                    {item.info.map((i: InfoItem, idx: number) => (
                        <InfoItem key={idx} {...i} />
                    ))}
                </React.Fragment>
            ))}

            {props.readoutItems.length > maxNumItemsOrDefault && (
                <div className="gap-horizontal-2xs col-span-4 flex items-center">
                    ...and {props.readoutItems.length - maxNumItemsOrDefault} more
                </div>
            )}
        </div>
    );
}

function InfoLabel(props: { item: ReadoutItem; noLabelColor?: boolean; compact?: boolean }): React.ReactNode {
    return (
        <div className="gap-horizontal-2xs font-bolder col-span-4 flex items-center">
            {!props.noLabelColor && (
                <div
                    className="border-neutral-subtle h-3 w-3 rounded-full border"
                    style={{ backgroundColor: props.item.color }}
                />
            )}
            <span className="block">{props.item.label}</span>
        </div>
    );
}

function InfoItem(props: InfoItem): React.ReactNode {
    return (
        <>
            <div>{props.adornment}</div>
            <div>{props.name}:</div>
            <div className="text-right">{makeFormattedInfoValue(props.value)}</div>
            <div className="text-right">{props.unit}</div>
        </>
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

function makeFormattedInfoValue(value: string | number | boolean | number[]): string {
    let formattedValue = "";

    if (value instanceof Array) {
        if (value.length === 3) {
            formattedValue = value.map((el) => formatValue(el)).join(", ");
        } else {
            formattedValue = value.map((el) => formatValue(el)).join(" - ");
        }
    } else {
        formattedValue = formatValue(value);
    }

    return formattedValue;
}

function formatValue(value: number | string | boolean): string {
    if (typeof value === "number") {
        return formatNumber(value);
    }
    return value.toString();
}
