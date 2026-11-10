import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { Button } from "@lib/components/Button";
import { Slider } from "@lib/components/Slider";
import type { SliderChangeEventDetails } from "@lib/components/Slider/types";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";

import type { DashboardSettingComponentProps } from "../DashboardSettingDefinition";

// Every change of the dashboard time makes all of its consumers refetch - so while dragging or stepping with the
// keyboard, the value is only committed once it has rested for a moment.
const COMMIT_DELAY_MS = 300;

function toIndex(sliderValue: number | readonly number[]): number {
    return typeof sliderValue === "number" ? sliderValue : (sliderValue[0] ?? 0);
}

/**
 * A discrete slider over the available time points (one step per time point), for the dashboard time
 * setting.
 */
export function DashboardTimeSlider(props: DashboardSettingComponentProps<number | null, readonly number[]>) {
    const timestamps = props.constraints;

    // Follows the slider right away, while the commit to the dashboard is debounced
    const [immediateValue, setImmediateValue, commitController] = useDebouncedOnChange<number | null>(
        props.value,
        commitIfStillOffered,
        COMMIT_DELAY_MS,
    );

    // A debounced drag was made against the options shown at the time - they may have changed (or be
    // recomputing) by the time it fires, so it is dropped rather than committing a stale time point.
    function commitIfStillOffered(value: number | null) {
        if (props.isSettling || (value !== null && !props.constraints.includes(value))) {
            // Resetting goes through the debounced setter, so its own commit is cancelled right away
            setImmediateValue(props.value);
            commitController.cancel();
            return;
        }
        props.onValueChange(value);
    }
    const selectedIndex = immediateValue === null ? -1 : timestamps.indexOf(immediateValue);
    const displayedIndex = Math.max(selectedIndex, 0);

    function formatIndex(index: number): string {
        const timestamp = timestamps[index];
        return timestamp === undefined ? "" : timestampUtcMsToCompactIsoString(timestamp);
    }

    function commitIndex(index: number) {
        const timestamp = timestamps[index];
        if (timestamp !== undefined) {
            setImmediateValue(timestamp);
            commitController.flush();
        }
    }

    function handleValueChange(sliderValue: number | readonly number[], eventDetails: SliderChangeEventDetails) {
        const index = toIndex(sliderValue);

        // Drags and keyboard steps are debounced - track presses and marker clicks commit right away
        if (eventDetails.reason !== "drag" && eventDetails.reason !== "keyboard") {
            commitIndex(index);
            return;
        }

        const timestamp = timestamps[index];
        if (timestamp !== undefined) {
            setImmediateValue(timestamp);
        }
    }

    // Shows the actual value - also one that isn't among the options (the slider can't show that)
    const valueText = immediateValue === null ? "No value" : timestampUtcMsToCompactIsoString(immediateValue);

    // An unavailable value puts the thumb on the first time point, where pressing it changes nothing - and with a
    // single time point, the slider can't change at all. So that time point is offered explicitly instead.
    const canSelectDisplayedTimestamp = selectedIndex === -1 && timestamps.length > 0;

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
            {canSelectDisplayedTimestamp && (
                <Button
                    size="small"
                    variant="outlined"
                    layoutClassName="shrink-0"
                    onClick={() => commitIndex(displayedIndex)}
                >
                    Use {formatIndex(displayedIndex)}
                </Button>
            )}
        </div>
    );
}
