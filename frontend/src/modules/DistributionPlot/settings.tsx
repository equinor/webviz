import React from "react";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import { ModuleFCProps } from "@framework/Module";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Slider } from "@lib/components/Slider";

import { DisplayMode, PlotType, State } from "./state";

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
export function Settings({ moduleContext, workbenchServices, initialSettings }: ModuleFCProps<State>) {
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const [numBins, setNumBins] = moduleContext.useStoreState("numBins");
    const [orientation, setOrientation] = moduleContext.useStoreState("orientation");
    const [displayMode, setDisplayMode] = moduleContext.useStoreState("displayMode");

    useApplyInitialSettingsToState(initialSettings, "plotType", "string", setPlotType);
    useApplyInitialSettingsToState(initialSettings, "numBins", "number", setNumBins);
    useApplyInitialSettingsToState(initialSettings, "orientation", "string", setOrientation);
    useApplyInitialSettingsToState(initialSettings, "crossPlottingType", "string", setCrossPlottingType);

    function handlePlotTypeChanged(value: string) {
        setPlotType(value as PlotType);
    }

    function handleNumBinsChange(_: Event, value: number | number[]) {
        if (Array.isArray(value)) {
            return;
        }
        setNumBins(value);
    }

    function handleOrientationChange(e: React.ChangeEvent<HTMLInputElement>) {
        setOrientation(e.target.value as "h" | "v");
    }

    function handleDisplayTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setDisplayMode(e.target.value as DisplayMode);
    }

    function makeContent(): React.ReactNode {
        if (plotType === null) {
            return null;
        }
        const content: React.ReactNode[] = [];

        if (plotType === PlotType.Histogram) {
            content.push(
                <Label text="Number of bins" key="number-of-bins">
                    <Slider value={numBins} onChange={handleNumBinsChange} min={1} max={30} valueLabelDisplay="auto" />
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
                        onChange={handleOrientationChange}
                        value={orientation}
                    />
                </Label>
            );
        }

        return content;
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Plot type" expanded>
                <Dropdown value={plotType as string} options={plotTypes} onChange={handlePlotTypeChanged} />
            </CollapsibleGroup>
            <CollapsibleGroup title="Plot settings" expanded>
                <div className="flex flex-col gap-2">
                    {makeContent()}
                    <Label text="Display multiple plots as">
                        <RadioGroup
                            options={[
                                {
                                    label: "Matrix",
                                    value: DisplayMode.PlotMatrix,
                                },
                                {
                                    label: "Single plot with multiple colors",
                                    value: DisplayMode.SinglePlotMultiColor,
                                },
                            ]}
                            onChange={handleDisplayTypeChange}
                            value={displayMode}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
        </div>
    );
}
