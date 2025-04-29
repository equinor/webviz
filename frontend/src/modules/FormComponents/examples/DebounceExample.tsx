import React from "react";

import { DebouncedField } from "@lib/components/@next/DebouncedField/debouncedField";
import { Input } from "@lib/components/@next/Input";
import { NumberInput } from "@lib/components/@next/Input/numberInput";
import { Slider } from "@lib/components/@next/Slider";

import { ExampleTitle } from "../ExampleTitle";
import { ValueResult } from "../ValueResult";

export function DebounceExample(): React.ReactNode {
    const [inputValue, setInputValue] = React.useState<string>("Foo");
    const [immediateInputValue, setImmediateInputValue] = React.useState<string>(inputValue);

    const [numberInputValue, setNumberInputValue] = React.useState<number>(10);
    const [immediateNumberInputValue, setImmediateNumberInputValue] = React.useState<number>(numberInputValue);

    const [sliderValue, setSliderValue] = React.useState<number[]>([10, 90]);
    const [immediateSliderValue, setImmediateSliderValue] = React.useState<number[]>(sliderValue);

    return (
        <>
            <ExampleTitle>Debounced fields</ExampleTitle>

            <DebouncedField
                value={inputValue}
                flushOnBlur
                debounceTimeMs={1000}
                onValueChange={setInputValue}
                onImmediateValueChange={setImmediateInputValue}
            >
                <Input placeholder="My placeholder" />
            </DebouncedField>

            <div className="flex items-center gap-2 flex-wrap">
                Internal value: <ValueResult>{immediateInputValue}</ValueResult>
                External value: <ValueResult>{inputValue}</ValueResult>
            </div>

            <DebouncedField
                value={numberInputValue}
                flushOnBlur
                debounceTimeMs={1000}
                onValueChange={setNumberInputValue}
                onImmediateValueChange={setImmediateNumberInputValue}
            >
                <NumberInput />
            </DebouncedField>

            <div className="flex items-center gap-2 flex-wrap">
                Internal value: <ValueResult>{immediateNumberInputValue}</ValueResult>
                External value: <ValueResult>{numberInputValue}</ValueResult>
            </div>

            <DebouncedField
                value={sliderValue}
                flushOnBlur
                debounceTimeMs={1000}
                onValueChange={setSliderValue}
                onImmediateValueChange={setImmediateSliderValue}
            >
                <Slider className="w-full" />
            </DebouncedField>

            <div className="flex items-center gap-2 flex-wrap">
                Internal value: <ValueResult>{immediateSliderValue.join("-")}</ValueResult>
                External value: <ValueResult>{sliderValue.join("-")}</ValueResult>
            </div>
        </>
    );
}
