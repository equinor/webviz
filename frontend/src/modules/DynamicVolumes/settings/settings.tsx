import type React from "react";

import { useAtom, useAtomValue } from "jotai";

import { vectorDefinitions } from "@assets/vectorDefinitions";

import { Frequency_api } from "@api";
import { EnsemblePicker } from "@framework/components/EnsemblePicker";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { ContextHelp } from "@lib/components/ContextHelp";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";

import type { Interfaces } from "../interfaces";
import { PlotDimension, RegionSelectionMode, StatisticsType, VisualizationMode } from "../typesAndEnums";
import { isInPlaceVector } from "../utils/regionalVectors";

import {
    colorByAtom,
    regionSelectionModeAtom,
    resampleFrequencyAtom,
    selectedStatisticsAtom,
    showRecoveryFactorAtom,
    subplotByAtom,
    visualizationModeAtom,
} from "./atoms/baseAtoms";
import {
    allRegionNamesAtom,
    allZoneNamesAtom,
    ensembleFipRegionsAtom,
    hasFipRegionsDataAtom,
    isVectorListFetchingAtom,
    regionalVectorsInfoAtom,
} from "./atoms/derivedAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedFipArrayAtom,
    selectedRegionNamesAtom,
    selectedRegionsAtom,
    selectedVectorBaseNameAtom,
    selectedZoneNamesAtom,
} from "./atoms/persistableFixableAtoms";

const visualizationModes = [
    { value: VisualizationMode.IndividualRealizations, label: "Individual realizations" },
    { value: VisualizationMode.StatisticalLines, label: "Statistical lines" },
    { value: VisualizationMode.StatisticalFanchart, label: "Statistical lines with fill" },
];

const PLOT_DIMENSION_LABELS: Record<PlotDimension, string> = {
    [PlotDimension.Ensemble]: "Ensemble",
    [PlotDimension.FipRegion]: "Region (FIPNUM)",
    [PlotDimension.Zone]: "Zone",
    [PlotDimension.GeoRegion]: "Region",
};

const regionSelectionModeOptions = [
    { value: RegionSelectionMode.FipNumber, label: "FIP number" },
    { value: RegionSelectionMode.ZoneRegion, label: "Zone / Region" },
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

/**
 * Compute the available plot dimensions given the region selection mode.
 * Ensemble is always available as a dimension.
 */
function getAvailableDimensions(regionSelectionMode: RegionSelectionMode): PlotDimension[] {
    const dims: PlotDimension[] = [PlotDimension.Ensemble];

    if (regionSelectionMode === RegionSelectionMode.FipNumber) {
        dims.push(PlotDimension.FipRegion);
    } else {
        dims.push(PlotDimension.Zone, PlotDimension.GeoRegion);
    }
    return dims;
}

/**
 * Compute valid subplotBy options given the current colorBy choice and constraints.
 * With multiple ensembles and colorBy != Ensemble, subplotBy is forced to Ensemble.
 */
function getSubplotByOptions(
    colorBy: PlotDimension,
    availableDims: PlotDimension[],
    multipleEnsembles: boolean,
): (PlotDimension | null)[] {
    if (multipleEnsembles && colorBy !== PlotDimension.Ensemble) {
        // Must assign Ensemble to subplotBy
        return [PlotDimension.Ensemble];
    }

    const options: (PlotDimension | null)[] = [null];
    for (const dim of availableDims) {
        options.push(dim);
    }
    return options;
}

export function Settings(props: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const [selectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(selectedEnsembleIdentsAtom);
    const [resampleFrequency, setResampleFrequency] = useAtom(resampleFrequencyAtom);
    const [visualizationMode, setVisualizationMode] = useAtom(visualizationModeAtom);
    const [colorBy, setColorBy] = useAtom(colorByAtom);
    const [subplotBy, setSubplotBy] = useAtom(subplotByAtom);
    const [selectedStatistics, setSelectedStatistics] = useAtom(selectedStatisticsAtom);
    const [showRecoveryFactor, setShowRecoveryFactor] = useAtom(showRecoveryFactorAtom);
    const [selectedVectorBaseName, setSelectedVectorBaseName] = useAtom(selectedVectorBaseNameAtom);
    const [selectedFipArray, setSelectedFipArray] = useAtom(selectedFipArrayAtom);
    const [selectedRegions, setSelectedRegions] = useAtom(selectedRegionsAtom);
    const [regionSelectionMode, setRegionSelectionMode] = useAtom(regionSelectionModeAtom);
    const [selectedZoneNames, setSelectedZoneNames] = useAtom(selectedZoneNamesAtom);
    const [selectedRegionNames, setSelectedRegionNames] = useAtom(selectedRegionNamesAtom);

    const isVectorListFetching = useAtomValue(isVectorListFetchingAtom);
    const regionalInfo = useAtomValue(regionalVectorsInfoAtom);
    const ensembleFipRegions = useAtomValue(ensembleFipRegionsAtom);
    const hasFipRegionsData = useAtomValue(hasFipRegionsDataAtom);
    const allZoneNames = useAtomValue(allZoneNamesAtom);
    const allRegionNames = useAtomValue(allRegionNamesAtom);

    // ── Derived dimension options ──

    const multipleEnsembles = (selectedEnsembleIdents.value ?? []).length > 1;
    const availableDims = getAvailableDimensions(regionSelectionMode);

    // Auto-fix colorBy if current value is not available
    const effectiveColorBy = availableDims.includes(colorBy) ? colorBy : availableDims[0];
    if (effectiveColorBy !== colorBy) {
        setColorBy(effectiveColorBy);
    }

    const subplotByOptions = getSubplotByOptions(effectiveColorBy, availableDims, multipleEnsembles);

    // Auto-fix subplotBy if current value is not valid
    const effectiveSubplotBy = subplotByOptions.includes(subplotBy) ? subplotBy : subplotByOptions[0];
    if (effectiveSubplotBy !== subplotBy) {
        setSubplotBy(effectiveSubplotBy);
    }

    const colorByDropdownOptions = availableDims.map((d) => ({
        value: d,
        label: PLOT_DIMENSION_LABELS[d],
    }));

    const subplotByDropdownOptions = subplotByOptions.map((d) => ({
        value: d ?? "__none__",
        label: d === null ? "None" : PLOT_DIMENSION_LABELS[d],
    }));

    // ── Handlers ──

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

    function handleRegionSelectionModeChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newMode = e.target.value as RegionSelectionMode;

        if (ensembleFipRegions) {
            if (newMode === RegionSelectionMode.ZoneRegion) {
                // Convert current FIP numbers → zones + regions
                const zones = new Set<string>();
                const regions = new Set<string>();
                for (const fip of selectedRegions.value) {
                    const zr = ensembleFipRegions.getZoneRegionForFipNumber(fip);
                    if (zr) {
                        zones.add(zr.zone);
                        regions.add(zr.region);
                    }
                }
                setSelectedZoneNames([...zones]);
                setSelectedRegionNames([...regions]);
            } else {
                // Convert current zones × regions → FIP numbers
                const fipNumbers = new Set<number>();
                for (const zone of selectedZoneNames.value) {
                    for (const region of selectedRegionNames.value) {
                        const fip = ensembleFipRegions.getFipNumberForZoneRegion(zone, region);
                        if (fip !== undefined) {
                            fipNumbers.add(fip);
                        }
                    }
                }
                setSelectedRegions([...fipNumbers].sort((a, b) => a - b));
            }
        }

        setRegionSelectionMode(newMode);

        // Eagerly fix colorBy / subplotBy so the view never sees a stale dimension.
        // Without this, the interface propagates the new mode before the render-time
        // auto-fix has had a chance to update colorBy, causing a brief flash of wrong labels.
        const newAvailableDims = getAvailableDimensions(newMode);
        if (!newAvailableDims.includes(colorBy)) {
            const newColorBy = newAvailableDims[0];
            setColorBy(newColorBy);

            // Also fix subplotBy against the new colorBy
            const newSubplotByOptions = getSubplotByOptions(newColorBy, newAvailableDims, multipleEnsembles);
            if (!newSubplotByOptions.includes(subplotBy)) {
                setSubplotBy(newSubplotByOptions[0]);
            }
        } else {
            // colorBy is still valid, but subplotBy might not be
            const newSubplotByOptions = getSubplotByOptions(colorBy, newAvailableDims, multipleEnsembles);
            if (!newSubplotByOptions.includes(subplotBy)) {
                setSubplotBy(newSubplotByOptions[0]);
            }
        }
    }

    function handleZoneNamesChange(values: string[]) {
        setSelectedZoneNames(values);
    }

    function handleRegionNamesChange(values: string[]) {
        setSelectedRegionNames(values);
    }

    function handleVisualizationModeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setVisualizationMode(e.target.value as VisualizationMode);
    }

    function handleColorByChange(newVal: string) {
        setColorBy(newVal as PlotDimension);
    }

    function handleSubplotByChange(newVal: string) {
        setSubplotBy(newVal === "__none__" ? null : (newVal as PlotDimension));
    }

    function handleStatisticToggle(stat: StatisticsType) {
        setSelectedStatistics((prev) => (prev.includes(stat) ? prev.filter((s) => s !== stat) : [...prev, stat]));
    }

    const availableRegions = selectedFipArray.value ? (regionalInfo.fipArrays[selectedFipArray.value] ?? []) : [];

    // Show zone/region mode option only when FIP region mapping data is available
    const showZoneRegionOption = hasFipRegionsData;

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

            <CollapsibleGroup title="Vector selection" contentClassName="flex flex-col gap-2" expanded>
                <Label text="Time series">
                    <Dropdown
                        options={regionalInfo.vectorNames.map((v) => {
                            const desc = vectorDefinitions[v]?.description;
                            return { value: v, label: desc ? `${desc} (${v})` : v };
                        })}
                        value={selectedVectorBaseName.value ?? ""}
                        onChange={handleVectorBaseNameChange}
                        disabled={isVectorListFetching || regionalInfo.vectorNames.length === 0}
                    />
                </Label>

                <div className="flex flex-row gap-2">
                    <Checkbox
                        label="Show recovery factor"
                        checked={showRecoveryFactor}
                        disabled={!isInPlaceVector(selectedVectorBaseName.value)}
                        onChange={(_e, checked) => setShowRecoveryFactor(checked)}
                    />
                    <ContextHelp
                        title="Recovery factor"
                        content={
                            <>
                                Recovery factor is calculated per realization on the aggregated (summed) in-place
                                volumes across the selected regions:
                                <br />
                                <br />
                                <b>RF(t) = (V_initial - V(t)) / V_initial</b>
                                <br />
                                <br />
                                Where <b>V_initial</b> is the in-place volume at the first timestep and <b>V(t)</b> is
                                the volume at timestep t.
                                <br />
                                Regions are summed first, then recovery is computed on the total.
                                <br />
                                <br />
                                Only available for in-place vectors (ROIP, RGIP, RWIP).
                            </>
                        }
                    />
                </div>

                {Object.keys(regionalInfo.fipArrays).length > 1 && (
                    <Label text="FIP array">
                        <Dropdown
                            options={Object.keys(regionalInfo.fipArrays).map((f) => ({ value: f, label: f }))}
                            value={selectedFipArray.value ?? ""}
                            onChange={handleFipArrayChange}
                        />
                    </Label>
                )}

                {showZoneRegionOption && (
                    <Label text="Region selection">
                        <RadioGroup
                            options={regionSelectionModeOptions}
                            value={regionSelectionMode}
                            onChange={handleRegionSelectionModeChange}
                            direction="horizontal"
                        />
                    </Label>
                )}

                {regionSelectionMode === RegionSelectionMode.FipNumber ? (
                    <Label text="Regions">
                        <Select
                            options={availableRegions.map((r) => ({ value: String(r), label: `Region ${r}` }))}
                            value={selectedRegions.value.map(String)}
                            onChange={handleRegionsChange}
                            size={Math.min(availableRegions.length, 8)}
                            multiple
                            showQuickSelectButtons
                        />
                    </Label>
                ) : (
                    <>
                        <Label text="Zones">
                            <Select
                                options={allZoneNames.map((z) => ({ value: z, label: z }))}
                                value={selectedZoneNames.value}
                                onChange={handleZoneNamesChange}
                                size={Math.min(allZoneNames.length, 8)}
                                multiple
                                showQuickSelectButtons
                            />
                        </Label>
                        <Label text="Regions">
                            <Select
                                options={allRegionNames.map((r) => ({ value: r, label: r }))}
                                value={selectedRegionNames.value}
                                onChange={handleRegionNamesChange}
                                size={Math.min(allRegionNames.length, 8)}
                                multiple
                                showQuickSelectButtons
                            />
                        </Label>
                    </>
                )}
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
                    <Dropdown
                        options={colorByDropdownOptions}
                        value={effectiveColorBy}
                        onChange={handleColorByChange}
                    />
                </Label>
                <Label text="Subplot by">
                    <Dropdown
                        options={subplotByDropdownOptions}
                        value={effectiveSubplotBy ?? "__none__"}
                        onChange={handleSubplotByChange}
                    />
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
        </div>
    );
}
