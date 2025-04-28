import React from "react";

import { DiscreteSlider, Slider } from "@lib/components/@next/Slider";
import { ToggleButton } from "@lib/components/ToggleButton";

import { ValueResult } from "../ValueResult";

function toMulti(value: number | readonly number[]): readonly number[] {
    if (typeof value !== "number") return value;
    return [value, 100];
}

function toSingle(value: number | readonly number[]): number {
    if (typeof value === "number") return value;
    return value[0];
}

export function SliderExample(): React.ReactNode {
    const [inputValue, setInputValue] = React.useState<number | readonly number[]>(0);
    const [useMultiValue, setUseMultiValue] = React.useState(false);

    return (
        <>
            <div>
                <Slider value={inputValue} valueLabelDisplay="auto" onValueChange={setInputValue} />

                <DiscreteSlider value={inputValue} values={[0, 25, 50, 75, 100]} onValueChange={setInputValue} />

                <div className="mt-1">
                    <ToggleButton
                        className="!p-1 !text-xs"
                        active={useMultiValue}
                        onToggle={(active) => {
                            setUseMultiValue(active);
                            if (active) setInputValue(toMulti(inputValue));
                            else setInputValue(toSingle(inputValue));
                        }}
                    >
                        Multi-value
                    </ToggleButton>
                </div>
            </div>

            {Array.isArray(inputValue) ? (
                <>
                    <div className="flex gap-2">
                        <ValueResult>{inputValue[0]}</ValueResult>
                        <ValueResult>{inputValue[1]}</ValueResult>
                    </div>
                </>
            ) : (
                <ValueResult>{inputValue}</ValueResult>
            )}
        </>
    );
}
