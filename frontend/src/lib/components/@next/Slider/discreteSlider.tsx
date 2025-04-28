import React from "react";

import type { SliderProps } from "./slider";
import { Slider } from "./slider";

export type DiscreteSliderProps = {
    values: number[];
} & Omit<SliderProps, "min" | "max" | "step" | "markSteps">;

function getAndVerifySteps(values: number[]): number {
    if (values.length < 2) return 1;

    const expectedStep = values[1] - values[0];

    // Ensure that all values are evenly spread
    for (let i = 1; i < values.length - 1; i++) {
        const current = values[i];
        const next = values[i + 1];
        const step = next - current;

        if (step !== expectedStep) {
            throw Error(`Expected step between each value to be ${expectedStep}, instead saw ${step}`);
        }
    }

    return expectedStep;
}

function DiscreteSliderComponent(props: DiscreteSliderProps, ref: React.ForwardedRef<HTMLDivElement>): React.ReactNode {
    const { value, values, ...otherProps } = props;

    // ! We can only support evenly distributed values for now. Restricted values will be available in a later version of Base-UI
    const step = getAndVerifySteps(values);

    return (
        <>
            <Slider
                ref={ref}
                value={value}
                step={step}
                min={props.values[0]}
                max={props.values.at(-1)}
                markSteps
                {...otherProps}
            />
        </>
    );
}

export const DiscreteSlider = React.forwardRef(DiscreteSliderComponent);
