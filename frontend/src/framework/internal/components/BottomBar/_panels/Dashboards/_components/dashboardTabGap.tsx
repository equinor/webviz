import { Separator } from "@lib/components/Separator";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type DashboardTabGapProps = {
    /** Inner gaps (between two tabs) show a separator; the two outer gaps don't. */
    withSeparator: boolean;
    isDropTarget: boolean;
};

/**
 * The slot before, between or after dashboard tabs. Doubles as the drop indicator while
 * reordering, so the indicator replaces the separator instead of competing with it.
 */
export function DashboardTabGap(props: DashboardTabGapProps) {
    return (
        <div
            // Outer gaps get just enough width to fit the indicator without it being clipped by the scroll container
            className={resolveClassNames("relative flex shrink-0 self-stretch", {
                "px-3xs": props.withSeparator,
                "w-1": !props.withSeparator,
            })}
        >
            {props.withSeparator && (
                <Separator
                    orientation="vertical"
                    layoutClassName={resolveClassNames("my-xs", { invisible: props.isDropTarget })}
                />
            )}
            {props.isDropTarget && (
                <div className="bg-accent-strong absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full" />
            )}
        </div>
    );
}
