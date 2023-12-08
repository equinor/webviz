import React from "react";

import { applyInitialSettingsToState } from "@framework/InitialSettings";
import { ModuleFCProps } from "@framework/Module";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Slider } from "@lib/components/Slider";

import { receiverDefs } from "./receiverDefs";
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
    {
        value: PlotType.Scatter,
        label: "Scatter 2D",
    },
    {
        value: PlotType.ScatterWithColorMapping,
        label: "Scatter 2D with color mapping",
    },
];

//-----------------------------------------------------------------------------------------------------------
export function settings({ moduleContext, workbenchServices, initialSettings }: ModuleFCProps<State>) {
    const [prevChannelXName, setPrevChannelXName] = React.useState<string | null>(null);
    const [prevChannelYName, setPrevChannelYName] = React.useState<string | null>(null);
    const [prevChannelColorName, setPrevChannelColorName] = React.useState<string | null>(null);

    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const [numBins, setNumBins] = moduleContext.useStoreState("numBins");
    const [orientation, setOrientation] = moduleContext.useStoreState("orientation");

    applyInitialSettingsToState(initialSettings, "plotType", "string", setPlotType);
    applyInitialSettingsToState(initialSettings, "numBins", "number", setNumBins);
    applyInitialSettingsToState(initialSettings, "orientation", "string", setOrientation);

    const handlePlotTypeChanged = (value: string) => {
        setPlotType(value as PlotType);
    };

    const handleNumBinsChanged = (_: Event, value: number | number[]) => {
        if (Array.isArray(value)) {
            return;
        }
        setNumBins(value);
    };

    const handleOrientationChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOrientation(e.target.value as "h" | "v");
    };

    const makeContent = (): React.ReactNode => {
        if (plotType === null) {
            return null;
        }
        const content: React.ReactNode[] = [];

        if (plotType === PlotType.Histogram) {
            content.push(
                <Label text="Number of bins" key="number-of-bins">
                    <Slider value={numBins} onChange={handleNumBinsChanged} min={1} max={30} valueLabelDisplay="auto" />
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

        return content;
    };

    return (
        <>
            <Label text="Plot type">
                <Dropdown value={plotType as string} options={plotTypes} onChange={handlePlotTypeChanged} />
            </Label>
            {makeContent()}
        </>
    );
}
