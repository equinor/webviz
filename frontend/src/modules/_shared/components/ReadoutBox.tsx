import { Fragment, ReactNode, useEffect, useRef, useState } from "react";

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
    readoutItems: ReadoutItem[];
    maxNumItems?: number;
    noLabelColor?: boolean;
};

export function ReadoutBox(props: ReadoutBoxProps): ReactNode {
    const [flipped, setFlipped] = useState<boolean>(false);
    const readoutRoot = useRef<HTMLDivElement>(null);

    // How far away from the lower right corner the box is placed
    // TODO: Expose as prop?
    // TODO: use rem, not px here? parseInt(getComputedStyle(document.documentElement).fontSize) * 3
    // ! "48" is based on the left-12/right-12 layout values.
    const cornerDistance = 48;

    useEffect(() => {
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
    }, [flipped]);

    const readoutItems = props.readoutItems;
    const maxNumItems = props.maxNumItems ?? 3;

    if (readoutItems.length === 0) return null;

    return (
        <div
            ref={readoutRoot}
            className={`absolute bottom-10 right-12 z-50 w-60  flex flex-col gap-2 p-2 text-sm rounded border border-neutral-300 bg-white bg-opacity-75 backdrop-blur-sm pointer-events-none ${
                flipped ? "left-12" : "right-12"
            }`}
        >
            {readoutItems.map((item, idx) => {
                if (idx < maxNumItems) {
                    return (
                        <Fragment key={idx}>
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
                        </Fragment>
                    );
                }
            })}
            {readoutItems.length > maxNumItems && (
                <div className="flex items-center gap-2">...and {readoutItems.length - maxNumItems} more</div>
            )}
        </div>
    );
}

function InfoItem(props: InfoItem): ReactNode {
    return (
        <div className="table-row">
            <div className="table-cell w-4 align-middle">{props.adornment}</div>
            <div className="table-cell w-32 align-middle">{props.name}:</div>
            <div className="table-cell align-middle">{makeFormatedInfoValue(props.value)}</div>
            {props.unit && <div className="table-cell text-right align-middle">{props.unit}</div>}
        </div>
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
