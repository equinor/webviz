import React, { ChangeEvent } from "react";

import { BroadcastChannelKeyCategory } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Slider } from "@lib/components/Slider";

import { PlotType, State } from "./state";

const plotTypes = [
    {
        value: PlotType.Histogram,
        label: "Histogram",
    },
    {
        value: PlotType.BarChart,
        label: "Bar chart",
    },
];

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext }: ModuleFCProps<State>) {
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const [numBins, setNumBins] = moduleContext.useStoreState("numBins");
    const [orientation, setOrientation] = moduleContext.useStoreState("orientation");

    const channelX = moduleContext.useInputChannel("channelX");
    const channelY = moduleContext.useInputChannel("channelY");
    const channelColor = moduleContext.useInputChannel("channelColor");

    const handlePlotTypeChanged = (value: string) => {
        setPlotType(value as PlotType);
    };

    const handleNumBinsChanged = (_: Event, value: number | number[]) => {
        if (Array.isArray(value)) {
            return;
        }
        setNumBins(value);
    };

    const handleOrientationChanged = (e: ChangeEvent<HTMLInputElement>) => {
        setOrientation(e.target.value as "h" | "v");
    };

    const makeContent = (): React.ReactNode => {
        const content: React.ReactNode[] = [];
        if (channelX && !channelY && !channelColor) {
            content.push(
                <Label text="Plot type">
                    <Dropdown value={plotType as PlotType} options={plotTypes} onChange={handlePlotTypeChanged} />
                </Label>
            );

            if (plotType === PlotType.Histogram) {
                content.push(
                    <Label text="Number of bins" key="number-of-bins">
                        <Slider value={numBins} onChange={handleNumBinsChanged} min={1} max={30} displayValue />
                    </Label>
                );
            }

            if (plotType === PlotType.BarChart) {
                content.push(
                    <Label text="Orientation" key="orientation">
                        <RadioGroup
                            options={[
                                {
                                    label: "Horizontal",
                                    value: "h",
                                },
                                {
                                    label: "Vertical",
                                    value: "v",
                                },
                            ]}
                            onChange={handleOrientationChanged}
                            value={orientation}
                        />
                    </Label>
                );
            }
        }

        return content;
    };

    return <>{makeContent()}</>;
}
