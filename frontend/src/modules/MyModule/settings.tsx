import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { Button } from "@lib/components/Button";
import { Slider } from "@lib/components/Slider";

import { State } from "./state";

export const settings = (props: ModuleFCProps<State>) => {
    const setCount = props.moduleContext.useSetStoreValue("count");

    function handleSliderChange(_: Event, value: number | number[], __: number) {
        setCount(Array.isArray(value) ? value[0] : value);
    }

    return (
        <div className="flex flex-col gap-4">
            <Slider
                value={props.moduleContext.useStoreValue("count")}
                onChange={handleSliderChange}
                min={0}
                max={100}
                valueLabelDisplay="auto"
            />
        </div>
    );
};
