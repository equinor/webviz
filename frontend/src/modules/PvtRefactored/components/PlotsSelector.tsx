import React from "react";

import { Checkbox } from "@lib/components/Checkbox";

export type Plot = {
    label: string;
    value: string;
};

export type PlotsSelectorProps = {
    plots: Plot[];
    value: string[];
    onChange: (selectedPlots: string[]) => void;
};

export function PlotsSelector(props: PlotsSelectorProps): React.ReactNode {
    const [selectedPlots, setSelectedPlots] = React.useState<string[]>(props.value);

    function handlePlotSelectionChange(plotValue: string, checked: boolean) {
        const newSelectedPlots = [];
        if (checked) {
            newSelectedPlots.push(...selectedPlots, plotValue);
        } else {
            newSelectedPlots.push(...selectedPlots.filter((selectedPlot) => selectedPlot !== plotValue));
        }
        setSelectedPlots(newSelectedPlots);
        props.onChange(newSelectedPlots);
    }

    return (
        <div className="flex flex-col">
            {props.plots.map((plot) => {
                return (
                    <Checkbox
                        key={plot.value}
                        label={plot.label}
                        checked={selectedPlots.includes(plot.value)}
                        onChange={(_, checked) => handlePlotSelectionChange(plot.value, checked)}
                    />
                );
            })}
        </div>
    );
}
