import React from "react";

import { Slider } from "../Slider";
import { SliderProps } from "../Slider/slider";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { Mark } from "@mui/base";
export type TimestampSliderProps = {
    values: number[];
} & Omit<SliderProps, "min" | "max" | "step" | "marks">;

export const TimestampSlider = React.forwardRef(
    (props: TimestampSliderProps, ref: React.ForwardedRef<HTMLDivElement>) => {
        const { values, ...sliderProps } = props;

        const min = Math.min(...values);
        const max = Math.max(...values);
        const marks = values.map((value) => ({ value, label: timestampUtcMsToCompactIsoString(value) }));

        return (
            <Slider
                {...sliderProps}
                min={min}
                max={max}
                step={null}
                marks={marks}
                ref={ref}
            />
        );
    }
);

TimestampSlider.displayName = "TimestampSlider";
