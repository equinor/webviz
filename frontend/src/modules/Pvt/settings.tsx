import React, { useEffect } from "react";
import { ModuleFCProps } from "@framework/Module";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";

import { PvtData } from "@api";
import { usePvtDataQuery } from "./queryHooks";

import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import state, { PvtPlotData } from "./state";
//-----------------------------------------------------------------------------------------------------------


// The different visualization options for each phase
type PlotOptionType = {
    value: string;
    label: string;
}
const OilPlotOptions: PlotOptionType[] = [
    { value: "volumefactor", label: "Formation Volume Factor" },
    { value: "viscosity", label: "Viscosity" },
    { value: "density", label: "Density" },
    { value: "ratio", label: "Gas/Oil Ratio (Rs) at Psat" },

]
const GasPlotOptions: PlotOptionType[] = [
    { value: "volumefactor", label: "Formation Volume Factor" },
    { value: "viscosity", label: "Viscosity" },
    { value: "density", label: "Density" },
    { value: "ratio", label: "Vaporized Oil Ratio (Rv) at Psat" },

]
const WaterPlotOptions: PlotOptionType[] = [
    { value: "volumefactor", label: "Formation Volume Factor" },
    { value: "viscosity", label: "Viscosity" },
    { value: "density", label: "Density" },

]

// Helper to find the relevant label given a plot value and phase
const findPlotLabel = (value: string, phase: string): string => {
    if (phase === "Oil") {
        return OilPlotOptions.filter((plot) => plot.value === value)[0].label
    }
    else if (phase === "Gas") {
        return GasPlotOptions.filter((plot) => plot.value === value)[0].label
    }
    else if (phase === "Water") {
        return WaterPlotOptions.filter((plot) => plot.value === value)[0]?.label || ""
    }
    else {
        return ""
    }
}

// Helper to get all unique pvtnum from the pvtdata
const getUniquePvtNumsFromData = (pvtData: PvtData): number[] => {
    return [...new Set(pvtData.pvtnum.map((num) => num))]
}

//Helpers to populate dropdowns
const stringToOptions = (strings: string[]): DropdownOption[] => {
    return strings.map((string) => ({ label: string, value: string }));
}
const numberToOptions = (numbers: number[]): DropdownOption[] => {
    return numbers.map((number) => ({ label: number.toString(), value: number.toString() }));
}

export function settings({ moduleContext, workbenchServices }: ModuleFCProps<state>) {
    // From Workbench
    const workbenchEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);

    //Just using the first ensemble for now
    const selectedEnsemble = workbenchEnsembles?.[0] ?? { caseUuid: null, ensembleName: null };

    // Settings state. Initialized/currently selected values
    const [activeRealization, setActiveRealization] = moduleContext.useStoreState("realization"); // Should be a query. not implemented
    const [activePvtName, setActivePvtName] = moduleContext.useStoreState("pvtName");
    const [activePvtPlots, setActivePvtPlots] = moduleContext.useStoreState("pvtVisualizations");
    const [activePvtNum, setActivePvtNum] = moduleContext.useStoreState("pvtNum");
    const [groupBy, setGroupBy] = moduleContext.useStoreState("groupBy"); // not implemented

    // Plot data state for view
    const setPvtPlotDataSet = moduleContext.useSetStoreValue("pvtPlotDataSet");

    // Local state to handle available options
    const [availablePvtNums, setAvailablePvtNums] = React.useState<number[]>([]);
    const [availablePlots, setAvailablePlots] = React.useState<PlotOptionType[]>([]);

    // Queries
    const pvtDataQuery = usePvtDataQuery(selectedEnsemble.caseUuid, selectedEnsemble.ensembleName, activeRealization);


    // effect triggered by changing pvtName(phase). Updates available pvtNums, available plots and check if currently selected plots are still valid
    useEffect(() => {
        if (pvtDataQuery.data && activePvtName) {
            // Find the data for the selected phase
            const pvtNameData = pvtDataQuery.data.filter((pvtData) => pvtData.name === activePvtName)[0]
            const uniquePvtNums = getUniquePvtNumsFromData(pvtNameData);

            // Set available pvtNums and set activePvtNum to first available pvtNum if the current one is not available
            setAvailablePvtNums(uniquePvtNums)
            if (!activePvtNum || !uniquePvtNums.includes(activePvtNum)) {
                setActivePvtNum(uniquePvtNums[0])
            }

            // Set available plots
            let newAvailablePlots = pvtNameData.phase === "Oil" ? OilPlotOptions : pvtNameData.phase === "Gas" ? GasPlotOptions : WaterPlotOptions
            setAvailablePlots(newAvailablePlots)


            // Check if currently selected plots are still valid. Either filter current selections or set to all available plots if none are selected/valid
            const availablePlotValues = newAvailablePlots.map((plot) => plot.value)
            if (!activePvtPlots) {
                setActivePvtPlots(availablePlotValues)
            }
            else if (!activePvtPlots.every(value => availablePlotValues.includes(value))) {
                let currentVisualizations = activePvtPlots.filter(value => availablePlotValues.includes(value));

                if (currentVisualizations.length === 0) {
                    setActivePvtPlots([...availablePlotValues]);
                }
                else {
                    setActivePvtPlots(currentVisualizations);
                }
            }

        }
    }, [pvtDataQuery.data, activePvtName])

    // effect triggered by changing any setting. Updates list of plot data sent to view
    // Split up? Have in view instead?
    useEffect(() => {
        if (activePvtNum && activePvtName && activePvtPlots && pvtDataQuery.data) {
            // Find the data for the selected phase
            const currentPvtData = pvtDataQuery.data.filter((pvtData) => pvtData.name === activePvtName)[0]

            // Find the indices of the data that has the selected pvtNum
            const indicesToKeep: number[] = []
            currentPvtData.pvtnum.forEach((num, index) => {
                if (num === activePvtNum) {
                    indicesToKeep.push(index)
                }
            })


            const pvtPlotData: PvtPlotData[] = []

            // Find relevant pressure (x-values)
            const pressure: number[] = indicesToKeep.map(index => currentPvtData.pressure[index])

            // Find relevant ratio (text for hover and borderline)

            const ratio: number[] = indicesToKeep.map(index => currentPvtData.ratio[index])
            // Loop through each of the active visualizations and add the relevant data for the y-axis to the plot data
            for (let pvtVisualization of activePvtPlots) {
                const y_values: number[] = []
                let yUnit: string = ""
                const title = findPlotLabel(pvtVisualization, currentPvtData.phase) + "(" + currentPvtData.phase + ")"
                if (pvtVisualization === "volumefactor") {
                    y_values.push(...indicesToKeep.map(index => currentPvtData.volumefactor[index]))
                    yUnit = currentPvtData.volumefactor_unit

                }
                else if (pvtVisualization === "viscosity") {
                    y_values.push(...indicesToKeep.map(index => currentPvtData.viscosity[index]))
                    yUnit = currentPvtData.viscosity_unit
                }
                else if (pvtVisualization === "density") {
                    y_values.push(...indicesToKeep.map(index => currentPvtData.density[index]))
                    yUnit = currentPvtData.density_unit
                }
                else if (pvtVisualization === "ratio") {
                    y_values.push(...indicesToKeep.map(index => currentPvtData.ratio[index]))
                    yUnit = currentPvtData.ratio_unit
                }


                pvtPlotData.push({
                    pressure: pressure,
                    pressureUnit: currentPvtData.pressure_unit,
                    y: y_values,
                    yUnit: yUnit,
                    ratio: ratio,
                    pvtNum: activePvtNum,
                    phaseType: currentPvtData.phase,
                    title: title
                })

            };
            setPvtPlotDataSet(pvtPlotData)
        }
    },
        [activePvtNum, activePvtName, activePvtPlots, pvtDataQuery.data]
    )

    // Handle failed query
    if (!pvtDataQuery.data) { return (<div>No pvt data</div>) }

    // Get available PvtNames from query
    const availablePvtNames = pvtDataQuery.data.map((pvtData) => pvtData.name);


    // Handle toggling of visualization checkboxes
    const handleToggledVisualization = (checked: boolean, triggeredPlot: string) => {
        if (!activePvtPlots) {
            return
        }
        if (checked) {
            setActivePvtPlots([...activePvtPlots, triggeredPlot])
        }
        else {
            setActivePvtPlots(activePvtPlots.filter((plot) => plot !== triggeredPlot))
        }
    }
    return (
        <div>
            <ApiStateWrapper
                apiResult={pvtDataQuery}
                errorComponent={"Error loading pvt data"}
                loadingComponent={"Error loading pvt data"}
            >
                <Label text="Realization">
                    <Dropdown
                        options={numberToOptions([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])}
                        value={activeRealization ? activeRealization.toString() : "0"}
                        onChange={(real) => setActiveRealization(parseInt(real))}
                        filter={true}
                    />
                </Label>
                <Label text="PvtNum">
                    <Dropdown
                        options={numberToOptions(availablePvtNums)}
                        value={activePvtNum?.toString()}
                        onChange={(pvtNum) => setActivePvtNum(parseInt(pvtNum))}
                        filter={true}
                    />
                </Label>
                <Label text="Phase">
                    <Dropdown
                        options={stringToOptions(availablePvtNames)}
                        value={activePvtName || availablePvtNames[0]}
                        onChange={(name) => setActivePvtName(name)}
                        filter={true}
                    />
                </Label>
                <Label text="Visualization">
                    <>
                        {availablePlots?.map((plot) => (
                            <Checkbox key={plot.value}
                                label={plot.value}
                                checked={activePvtPlots ? activePvtPlots.includes(plot.value) : false}
                                onChange={(_, checked) => handleToggledVisualization(checked, plot.value)}

                            />))

                        }
                    </>
                </Label>
            </ApiStateWrapper>
        </div>
    );
}

