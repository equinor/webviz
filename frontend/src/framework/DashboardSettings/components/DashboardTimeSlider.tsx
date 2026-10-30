import React from "react";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { Slider } from "@lib/components/Slider";
import type { SliderChangeEventDetails } from "@lib/components/Slider/types";

import type { DashboardSettingComponentProps } from "../DashboardSettingDefinition";

// Every change of the dashboard time makes all of its consumers refetch - so while dragging, the value is
// only committed once the thumb has rested for a moment.
const DRAG_COMMIT_DELAY_MS = 300;

function toIndex(sliderValue: number | readonly number[]): number {
    return typeof sliderValue === "number" ? sliderValue : (sliderValue[0] ?? 0);
}

/**
 * A discrete slider over the available time points (one step per time point), for the dashboard time
 * setting.
 */
export function DashboardTimeSlider(props: DashboardSettingComponentProps<number | null, readonly number[]>) {
    const timestamps = props.constraints;
    const selectedIndex = props.value === null ? -1 : timestamps.indexOf(props.value);

    // While dragging, before the value is committed
    const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
    const displayedIndex = draggedIndex ?? Math.max(selectedIndex, 0);

    const commitTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(function clearPendingCommitOnUnmount() {
        return () => {
            if (commitTimeoutRef.current) {
                clearTimeout(commitTimeoutRef.current);
            }
        };
    }, []);

    function formatIndex(index: number): string {
        const timestamp = timestamps[index];
        return timestamp === undefined ? "" : timestampUtcMsToCompactIsoString(timestamp);
    }

    function commitIndex(index: number) {
        setDraggedIndex(null);

        const timestamp = timestamps[index];
        if (timestamp !== undefined) {
            props.onValueChange(timestamp);
        }
    }

    function handleValueChange(sliderValue: number | readonly number[], eventDetails: SliderChangeEventDetails) {
        const index = toIndex(sliderValue);

        if (commitTimeoutRef.current) {
            clearTimeout(commitTimeoutRef.current);
            commitTimeoutRef.current = null;
        }

        // Track presses and keyboard steps commit right away
        if (eventDetails.reason !== "drag") {
            commitIndex(index);
            return;
        }

        setDraggedIndex(index);
        commitTimeoutRef.current = setTimeout(() => {
            commitTimeoutRef.current = null;
            commitIndex(index);
        }, DRAG_COMMIT_DELAY_MS);
    }

    // Shows the actual value - also one that isn't among the options (the slider can't show that)
    let valueText = "No value";
    if (draggedIndex !== null) {
        valueText = formatIndex(draggedIndex);
    } else if (props.value !== null) {
        valueText = timestampUtcMsToCompactIsoString(props.value);
    }

    return (
        <div className="gap-x-sm flex items-center">
            <Slider
                layoutClassName="grow min-w-0"
                min={0}
                max={Math.max(timestamps.length - 1, 0)}
                step={1}
                markers={timestamps.map((_, index) => index)}
                markerLabels={(index, markerIndex) =>
                    markerIndex === 0 || markerIndex === timestamps.length - 1 ? formatIndex(index) : null
                }
                valueLabelFormat={formatIndex}
                value={displayedIndex}
                disabled={timestamps.length === 0}
                onValueChange={handleValueChange}
            />
            <span className="text-body-sm shrink-0 whitespace-nowrap">{valueText}</span>
        </div>
    );
}
