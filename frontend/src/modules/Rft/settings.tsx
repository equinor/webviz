import React, { useEffect } from "react";
import { ModuleFCProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";

import { Checkbox } from "@lib/components/Checkbox";
import { Label } from "@lib/components/Label";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import state, { RftWellAddress } from "./state";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";

import { useRftWellList } from "./queryHooks";

//Helpers to populate dropdowns
const stringToOptions = (strings: string[]): DropdownOption[] => {
    return strings.map((string) => ({ label: string, value: string }));
}
const numberToOptions = (numbers: number[]): DropdownOption[] => {
    return numbers.map((number) => ({ label: number.toString(), value: number.toString() }));
}

export function settings({ moduleContext, workbenchSession }: ModuleFCProps<state>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);

    const computedEnsembleIdent = fixupEnsembleIdent(selectedEnsembleIdent, ensembleSet);

    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }
    const rftWellListQuery = useSurfaceDirectoryQuery(
        computedEnsembleIdent?.getCaseUuid(),
        computedEnsembleIdent?.getEnsembleName()
    );

    // effect triggered by changing pvtName(phase). Updates available pvtNums, available plots and check if currently selected plots are still valid
    useEffect(() => {
        if (pvtDataQuery.data && activePvtName) {
            // Find the data for the selected phase
            const pvtDataAccessor = new PvtQueryDataAccessor(pvtDataQuery.data)

            // const pvtNameData = pvtDataQuery.data.filter((pvtData) => pvtData.name === activePvtName)[0]
            const uniquePvtNums = pvtDataAccessor.getPvtNums(activePvtName)

            // Set available pvtNums and set activePvtNum to first available pvtNum if the current one is not available
            setAvailablePvtNums(uniquePvtNums)
            let newActivePvtNum = activePvtNum
            if (!newActivePvtNum || !uniquePvtNums.includes(newActivePvtNum)) {
                newActivePvtNum = uniquePvtNums[0]
            }


            // Set available plots
            const currentPvtData = pvtDataAccessor.getPvtData(activePvtName, newActivePvtNum)

            const newAvailablePlots = getAvailablePlotsForPhase(currentPvtData.phase)
            // Check if currently selected plots are still valid. Either filter current selections or set to all available plots if none are selected/valid
            let newAvailablePlotValues = newAvailablePlots.map((plot) => plot.value)

            if (activePvtPlots && !activePvtPlots.every(value => newAvailablePlotValues.includes(value))) {
                const intersectedPlotValues = activePvtPlots.filter(value => newAvailablePlotValues.includes(value));

                if (intersectedPlotValues.length >= 0) {
                    newAvailablePlotValues = intersectedPlotValues
                }
            }
            setActivePvtNum(newActivePvtNum)
            setAvailablePlots(newAvailablePlots)
            setActivePvtPlots(newAvailablePlotValues)

        }
    }, [pvtDataQuery.data, activePvtName])

    // effect triggered by changing any setting. Updates list of plot data sent to view
    // Split up? Have in view instead?
    useEffect(() => {
        if (activePvtNum && activePvtName && activePvtPlots && pvtDataQuery.data) {
            // Find the data for the selected phase
            // const currentPvtData = pvtDataQuery.data.filter((pvtData) => (pvtData.name === activePvtName) && (pvtData.pvtnum === activePvtNum))[0]

            const pvtPlotData: PvtPlotData[] = []

            // Loop through each of the active visualizations and add the relevant data for the y-axis to the plot data
            for (const pvtPlot of activePvtPlots) {
                pvtPlotData.push({ pvtNum: activePvtNum, pvtName: activePvtName, pvtPlot: pvtPlot })
            }
            setPvtPlotDataSet(pvtPlotData)
        }
    },
        [activePvtNum, activePvtName, activePvtPlots, pvtDataQuery.data]
    )

    // Handle failed query
    if (!pvtDataQuery.data) { return (<div>No pvt data</div>) }


    // Get available PvtNames from query
    // Guess "new" will trigger a re-render?
    const pvtDataAccessor = new PvtQueryDataAccessor(pvtDataQuery.data)

    const availablePvtNames = pvtDataAccessor.getPvtNames()


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

