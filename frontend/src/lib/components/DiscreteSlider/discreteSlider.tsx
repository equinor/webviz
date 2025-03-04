import React from "react";

import { Slider } from "../Slider";
import type { SliderProps } from "../Slider/slider";

export type DiscreteSliderProps = {
    values: number[];
} & Omit<SliderProps, "min" | "max" | "step" | "marks">;

export const DiscreteSlider = React.forwardRef(
    (props: DiscreteSliderProps, ref: React.ForwardedRef<HTMLDivElement>) => {
        const { values, ...sliderProps } = props;

        const min = Math.min(...values);
        const max = Math.max(...values);

        return (
            <Slider
                {...sliderProps}
                min={min}
                max={max}
                step={null}
                marks={values.map((value) => ({ value }))}
                ref={ref}
            />
        );
    }
);

DiscreteSlider.displayName = "DiscreteSlider";
