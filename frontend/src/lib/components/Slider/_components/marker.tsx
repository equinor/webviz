export type MarkerVariant = "dot" | "tick" | "none";

export type MarkerProps = { variant: MarkerVariant; leftPosPercent: number };

export function Marker(props: MarkerProps) {
    if (props.variant === "tick") {
        return <TickMarker leftPosPercent={props.leftPosPercent} />;
    }

    if (props.variant === "dot") {
        return <DotMarker leftPosPercent={props.leftPosPercent} />;
    }
}

function TickMarker(props: { leftPosPercent: number }) {
    const className = "bg-neutral-active w-0.5 h-1 -bottom-1.5  absolute z-1 -translate-x-1/2";

    return <div className={className} style={{ left: `${props.leftPosPercent}%` }} />;
}

function DotMarker(props: { leftPosPercent: number }) {
    const className =
        "border border-neutral box-content size-(--mark-size) rounded-full absolute bg-surface z-1 top-0 -translate-y-1/4 -translate-x-1/2";

    return <div className={className} style={{ left: `${props.leftPosPercent}%` }} />;
}
