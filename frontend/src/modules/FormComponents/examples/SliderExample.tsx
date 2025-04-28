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
    const [inputValue, setInputValue] = React.useState<number | readonly number[]>(50);
    const [useMultiValue, setUseMultiValue] = React.useState(false);

    return (
        <>
            <div>
                <div className="grid grid-cols-[auto_auto_1fr] items-center gap-2 h-48">
                    <Slider
                        value={inputValue}
                        className="h-full col-span-1 row-span-2"
                        orientation="vertical"
                        valueLabelDisplay="auto"
                        onValueChange={setInputValue}
                    />

                    <DiscreteSlider
                        value={inputValue}
                        values={[0, 25, 50, 75, 100]}
                        className="h-full col-span-1 row-span-2"
                        orientation="vertical"
                        valueLabelDisplay="auto"
                        onValueChange={setInputValue}
                    />

                    <Slider value={inputValue} valueLabelDisplay="auto" onValueChange={setInputValue} />

                    <DiscreteSlider value={inputValue} values={[0, 25, 50, 75, 100]} onValueChange={setInputValue} />
                </div>

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
