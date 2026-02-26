import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { Slider } from "@lib/components/Slider";
import type { SliderProps } from "@lib/components/Slider/slider";
import { useDebouncedOnChange } from "@lib/hooks/usedDebouncedStateEmit";
import { useOptInControlledValue } from "@lib/hooks/useOptInControlledValue";

import type { Interfaces } from "./interfaces";

// Example implementation of a debounced and controlled/uncontrolled input
function DebouncedSlider(
    props: SliderProps & { initialValue?: number | number[]; onValueChange: (newValue: number | number[]) => void },
) {
    const { initialValue, debounceTimeMs, value, onValueChange, ...other } = props;

    const [controlledValue, setControlledValue] = useOptInControlledValue(
        initialValue ?? props.min ?? 0,
        value,
        onValueChange,
    );
    const [internalValue, setValue, debounceMng] = useDebouncedOnChange(
        controlledValue,
        setControlledValue,
        debounceTimeMs,
    );

    return (
        <div className="flex items-center w-full">
            <div className="w-full">
                {/* @ts-expect-error -- Proof of concept */}
                <Slider
                    {...other}
                    className="w-full grow"
                    value={internalValue}
                    onBlur={() => {
                        debounceMng.flush();
                    }}
                    onChange={(e, val) => {
                        setValue(val);
                    }}
                />
            </div>
            <p className="w-8">{internalValue}</p>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const View = (props: ModuleViewProps<Interfaces>) => {
    const [sliderVal, setSliderVal] = React.useState(0);

    function onSliderChange(newVal: number | number[]) {
        const v = Array.isArray(newVal) ? newVal[0] : newVal;
        setSliderVal(v);
    }

    return (
        <div className="h-full w-full flex flex-col">
            Controlled, debounce 0:
            <DebouncedSlider value={sliderVal} onValueChange={onSliderChange} debounceTimeMs={0} />
            Controlled, debounce 5000ms:
            <DebouncedSlider value={sliderVal} onValueChange={onSliderChange} debounceTimeMs={5000} />
            Uncontrolled, debounce 250:
            <DebouncedSlider initialValue={20} onValueChange={onSliderChange} debounceTimeMs={250} />
            <p>External value: {sliderVal}</p>
        </div>
    );
};

View.displayName = "View";
