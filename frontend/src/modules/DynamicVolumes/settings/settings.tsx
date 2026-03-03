import React from "react";

import { useAtom, useAtomValue } from "jotai";

import { Frequency_api } from "@api";
import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";

import type { Interfaces } from "../interfaces";
import { ColorBy, StatisticsType, VisualizationMode } from "../typesAndEnums";

import {
    colorByAtom,
    resampleFrequencyAtom,
    selectedEnsembleIdentsAtom,
    selectedFipArrayAtom,
    selectedRegionsAtom,
    selectedStatisticsAtom,
    selectedVectorBaseNameAtom,
    showHistogramAtom,
    visualizationModeAtom,
} from "./atoms/baseAtoms";
import { isVectorListFetchingAtom, regionalVectorsInfoAtom } from "./atoms/derivedAtoms";

const visualizationModes = [
    { value: VisualizationMode.IndividualRealizations, label: "Individual realizations" },
    { value: VisualizationMode.StatisticalLines, label: "Statistical lines" },
    { value: VisualizationMode.StatisticalFanchart, label: "Statistical fanchart" },
];

const colorByOptions = [
    { value: ColorBy.Ensemble, label: "Ensemble" },
    { value: ColorBy.Region, label: "Region (FIPNUM)" },
];

const statisticsOptions: { value: StatisticsType; label: string }[] = [
    { value: StatisticsType.Mean, label: "Mean" },
    { value: StatisticsType.P10, label: "P10" },
    { value: StatisticsType.P50, label: "P50" },
    { value: StatisticsType.P90, label: "P90" },
    { value: StatisticsType.Min, label: "Min" },
    { value: StatisticsType.Max, label: "Max" },
];

const frequencyOptions = [
    ...Object.values(Frequency_api).map((f) => ({ value: f, label: f.charAt(0) + f.slice(1).toLowerCase() })),
];

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);
    const [resampleFrequency, setResampleFrequency] = useAtom(resampleFrequencyAtom);
    const [visualizationMode, setVisualizationMode] = useAtom(visualizationModeAtom);
    const [colorBy, setColorBy] = useAtom(colorByAtom);
    const [selectedStatistics, setSelectedStatistics] = useAtom(selectedStatisticsAtom);
    const [showHistogram, setShowHistogram] = useAtom(showHistogramAtom);
    const [selectedVectorBaseName, setSelectedVectorBaseName] = useAtom(selectedVectorBaseNameAtom);
    const [selectedFipArray, setSelectedFipArray] = useAtom(selectedFipArrayAtom);
    const [selectedRegions, setSelectedRegions] = useAtom(selectedRegionsAtom);

    const isVectorListFetching = useAtomValue(isVectorListFetchingAtom);
    const regionalInfo = useAtomValue(regionalVectorsInfoAtom);

    // Auto-select first vector base name and FIP array when data arrives
    React.useEffect(() => {
        if (regionalInfo.vectorNames.length > 0 && !selectedVectorBaseName) {
            setSelectedVectorBaseName(regionalInfo.vectorNames[0]);
        }
    }, [regionalInfo.vectorNames, selectedVectorBaseName, setSelectedVectorBaseName]);

    React.useEffect(() => {
        const fipArrayKeys = Object.keys(regionalInfo.fipArrays);
        if (fipArrayKeys.length > 0 && !selectedFipArray) {
            setSelectedFipArray(fipArrayKeys[0]);
        }
    }, [regionalInfo.fipArrays, selectedFipArray, setSelectedFipArray]);

    // Auto-select all regions when FIP array changes
    React.useEffect(() => {
        if (selectedFipArray && regionalInfo.fipArrays[selectedFipArray]) {
            setSelectedRegions(regionalInfo.fipArrays[selectedFipArray]);
        }
    }, [selectedFipArray, regionalInfo.fipArrays, setSelectedRegions]);

    function handleEnsembleChange(ensembleIdentArray: RegularEnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdentArray);
    }

    function handleFrequencyChange(newVal: string) {
        setResampleFrequency(newVal as Frequency_api);
    }

    function handleVectorBaseNameChange(newVal: string) {
        setSelectedVectorBaseName(newVal);
    }

    function handleFipArrayChange(newVal: string) {
        setSelectedFipArray(newVal);
    }

    function handleRegionsChange(values: string[]) {
        setSelectedRegions(values.map(Number));
    }

    function handleVisualizationModeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setVisualizationMode(e.target.value as VisualizationMode);
    }

    function handleColorByChange(e: React.ChangeEvent<HTMLInputElement>) {
        setColorBy(e.target.value as ColorBy);
    }

    function handleStatisticToggle(stat: StatisticsType) {
        setSelectedStatistics((prev) => (prev.includes(stat) ? prev.filter((s) => s !== stat) : [...prev, stat]));
    }

    const availableRegions = selectedFipArray ? (regionalInfo.fipArrays[selectedFipArray] ?? []) : [];

    return (
        <div className="flex flex-col gap-2 overflow-y-auto">
            <CollapsibleGroup title="Ensembles" expanded>
                <EnsemblePicker
                    ensembles={ensembleSet.getRegularEnsembleArray()}
                    value={selectedEnsembleIdents.value ?? []}
                    onChange={handleEnsembleChange}
                />
            </CollapsibleGroup>

            <CollapsibleGroup title="Resampling frequency" expanded={false}>
                <Dropdown options={frequencyOptions} value={resampleFrequency} onChange={handleFrequencyChange} />
            </CollapsibleGroup>

            <CollapsibleGroup title="Vector selection" expanded>
                <Label text="Response">
                    <Dropdown
                        options={regionalInfo.vectorNames.map((v) => ({ value: v, label: v }))}
                        value={selectedVectorBaseName ?? ""}
                        onChange={handleVectorBaseNameChange}
                        disabled={isVectorListFetching || regionalInfo.vectorNames.length === 0}
                    />
                </Label>

                {Object.keys(regionalInfo.fipArrays).length > 1 && (
                    <Label text="FIP array">
                        <Dropdown
                            options={Object.keys(regionalInfo.fipArrays).map((f) => ({ value: f, label: f }))}
                            value={selectedFipArray ?? ""}
                            onChange={handleFipArrayChange}
                        />
                    </Label>
                )}

                <Label text="Regions">
                    <Select
                        options={availableRegions.map((r) => ({ value: String(r), label: `Region ${r}` }))}
                        value={selectedRegions.map(String)}
                        onChange={handleRegionsChange}
                        size={Math.min(availableRegions.length, 8)}
                        multiple
                    />
                </Label>
            </CollapsibleGroup>

            <CollapsibleGroup title="Visualization" expanded>
                <Label text="Mode">
                    <RadioGroup
                        options={visualizationModes}
                        value={visualizationMode}
                        onChange={handleVisualizationModeChange}
                    />
                </Label>
                <Label text="Color by">
                    <RadioGroup options={colorByOptions} value={colorBy} onChange={handleColorByChange} />
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
