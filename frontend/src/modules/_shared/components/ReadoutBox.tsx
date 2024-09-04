import { Fragment, ReactNode, useEffect, useRef, useState } from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

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

export type ReadoutBoxProps = {
    /** A list of readouts to display */
    readoutItems: ReadoutItem[];
    /** The max number of items to show. Excess items are hidden by a "... and X more." */
    maxNumItems?: number;
    /** Disables the small colored badge next to the item labels */
    noLabelColor?: boolean;
    /** Disables the mouse-avoiding behaviour */
    flipDisabled?: boolean;
};

export function ReadoutBox(props: ReadoutBoxProps): ReactNode {
    const readoutItems = props.readoutItems;
    const maxNumItems = props.maxNumItems ?? 3;

    const [flipped, setFlipped] = useState<boolean>(false);
    const readoutRoot = useRef<HTMLDivElement>(null);

    // How far away from the lower right corner the box is placed
    // TODO: Expose as prop?
    // ! "3" is based on the left-12/right-12 layout values.
    const cornerDistance = parseInt(getComputedStyle(document.documentElement).fontSize) * 3;

    useEffect(() => {
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

            const prefferredRight = parentRect.right - cornerDistance;
            const prefferredLeft = parentRect.right - width - cornerDistance;

            if (evt.clientX < prefferredLeft || evt.clientX > prefferredRight) {
                if (flipped) setFlipped(false);
            } else {
                if (!flipped) setFlipped(true);
            }
        }

        document.addEventListener("mousemove", maybeFlipBox);

        return () => document.removeEventListener("mousemove", maybeFlipBox);
    }, [cornerDistance, flipped, props.flipDisabled]);

    if (readoutItems.length === 0) return null;

    return (
        <div
            ref={readoutRoot}
            className={`absolute bottom-10 right-12 z-[9999] w-60 items-center grid grid-cols-[0.7rem,_1fr,_1fr,_auto] gap-x-2 gap-y-1 p-2 text-sm rounded border border-neutral-300 bg-white bg-opacity-75 backdrop-blur-sm pointer-events-none ${
                flipped ? "left-12" : "right-12"
            }`}
        >
            {readoutItems.map((item, idx) => {
                if (idx < maxNumItems) {
                    return (
                        <Fragment key={idx}>
                            {!props.noLabelColor && (
                                <div
                                    className="rounded-full w-3 h-3 border border-slate-500"
                                    style={{ backgroundColor: item.color }}
                                />
                            )}
                            <span
                                className={resolveClassNames("block font-bold", {
                                    "col-span-4": props.noLabelColor,
                                    "col-span-3": !props.noLabelColor,
                                })}
                            >
                                {item.label}
                            </span>

                            {item.info && item.info.map((i: InfoItem, idx: number) => <InfoItem key={idx} {...i} />)}
                        </Fragment>
                    );
                }
            })}
            {readoutItems.length > maxNumItems && (
                <div className="col-span-4 italic">...and {readoutItems.length - maxNumItems} more</div>
            )}
        </div>
    );
}

function InfoItem(props: InfoItem): ReactNode {
    return (
        <>
            <div className="place-self-center">{props.adornment}</div>
            <div className="">{props.name}:</div>
            <div className="place-self-end">{makeFormatedInfoValue(props.value)}</div>
            {props.unit && <div className=" text-right">{props.unit}</div>}
        </>
    );
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
