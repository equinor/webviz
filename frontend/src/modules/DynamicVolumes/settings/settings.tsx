import type React from "react";

import { useAtom } from "jotai";

import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";

import { GroupBy, StatisticsType, VisualizationMode } from "../typesAndEnums";

import { groupByAtom, selectedStatisticsAtom, showHistogramAtom, visualizationModeAtom } from "./atoms/baseAtoms";

const visualizationModes = [
    { value: VisualizationMode.IndividualRealizations, label: "Individual realizations" },
    { value: VisualizationMode.StatisticalLines, label: "Statistical lines" },
    { value: VisualizationMode.StatisticalFanchart, label: "Statistical fanchart" },
];

const groupByOptions = [
    { value: GroupBy.Ensemble, label: "Ensemble" },
    { value: GroupBy.Response, label: "Response" },
];

const statisticsOptions: { value: StatisticsType; label: string }[] = [
    { value: StatisticsType.Mean, label: "Mean" },
    { value: StatisticsType.P10, label: "P10" },
    { value: StatisticsType.P50, label: "P50" },
    { value: StatisticsType.P90, label: "P90" },
    { value: StatisticsType.Min, label: "Min" },
    { value: StatisticsType.Max, label: "Max" },
];

export function Settings(): React.ReactNode {
    const [visualizationMode, setVisualizationMode] = useAtom(visualizationModeAtom);
    const [groupBy, setGroupBy] = useAtom(groupByAtom);
    const [selectedStatistics, setSelectedStatistics] = useAtom(selectedStatisticsAtom);
    const [showHistogram, setShowHistogram] = useAtom(showHistogramAtom);

    function handleVisualizationModeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setVisualizationMode(e.target.value as VisualizationMode);
    }

    function handleGroupByChange(e: React.ChangeEvent<HTMLInputElement>) {
        setGroupBy(e.target.value as GroupBy);
    }

    function handleStatisticToggle(stat: StatisticsType) {
        setSelectedStatistics((prev) => (prev.includes(stat) ? prev.filter((s) => s !== stat) : [...prev, stat]));
    }

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup title="Visualization" expanded>
                <Label text="Mode">
                    <RadioGroup
                        options={visualizationModes}
                        value={visualizationMode}
                        onChange={handleVisualizationModeChange}
                    />
                </Label>
                <Label text="Group by">
                    <RadioGroup options={groupByOptions} value={groupBy} onChange={handleGroupByChange} />
                </Label>
            </CollapsibleGroup>

            {visualizationMode !== VisualizationMode.IndividualRealizations && (
                <CollapsibleGroup title="Statistics" expanded>
                    {statisticsOptions.map((opt) => (
                        <Checkbox
                            key={opt.value}
                            label={opt.label}
                            checked={selectedStatistics.includes(opt.value)}
                            onChange={() => handleStatisticToggle(opt.value)}
                        />
                    ))}
                </CollapsibleGroup>
            )}

            <CollapsibleGroup title="Linked views" expanded>
                <Checkbox
                    label="Show histogram for selected timestep"
                    checked={showHistogram}
                    onChange={(_e, checked) => setShowHistogram(checked)}
                />
            </CollapsibleGroup>
        </div>
    );
}
