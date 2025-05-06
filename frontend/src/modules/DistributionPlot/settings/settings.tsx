import type React from "react";

import { useAtom } from "jotai";

import { useApplyInitialSettingsToState } from "@framework/InitialSettings";
import type { ModuleSettingsProps } from "@framework/Module";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Slider } from "@lib/components/Slider";

import type { Interfaces } from "../interfaces";
import { PlotType } from "../typesAndEnums";

import { numBinsAtom, orientationAtom, plotTypeAtom } from "./atoms/baseAtoms";

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
export function Settings({ initialSettings }: ModuleSettingsProps<Interfaces>) {
    const [plotType, setPlotType] = useAtom(plotTypeAtom);
    const [numBins, setNumBins] = useAtom(numBinsAtom);
    const [orientation, setOrientation] = useAtom(orientationAtom);

    useApplyInitialSettingsToState(initialSettings, "plotType", "string", setPlotType);
    useApplyInitialSettingsToState(initialSettings, "numBins", "number", setNumBins);
    useApplyInitialSettingsToState(initialSettings, "orientation", "string", setOrientation);

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

    function makeContent(): React.ReactNode {
        if (plotType === null) {
            return null;
        }
        const content: React.ReactNode[] = [];

        if (plotType === PlotType.Histogram) {
            content.push(
                <CollapsibleGroup title="Plot settings" expanded>
                    <Label text="Number of bins" key="number-of-bins">
                        <Slider
                            value={numBins}
                            onChange={handleNumBinsChange}
                            min={1}
                            max={30}
                            valueLabelDisplay="auto"
                        />
                    </Label>
                </CollapsibleGroup>,
            );
        }

        if (plotType === PlotType.BarChart) {
            content.push(
                <CollapsibleGroup title="Plot settings" expanded>
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
                </CollapsibleGroup>,
            );
        }

        return content;
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Plot type" expanded>
                <Dropdown
                    key="plot-type"
                    value={plotType as string}
                    options={plotTypes}
                    onChange={handlePlotTypeChanged}
                />
            </CollapsibleGroup>
            {makeContent()}
        </div>
    );
}

Settings.displayName = "Settings";
