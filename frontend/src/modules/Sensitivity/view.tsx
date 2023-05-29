import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import SensitivityChart from "./sensitivityChart";
import SensitivityTable from "./sensitivityTable";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useGetSensitivities, useInplaceResponseQuery } from "./queryHooks";
import { State, PlotType } from "./state";
import { SensitivityAccessor } from "./sensitivityAccessor";
import { AdjustmentsHorizontalIcon, TableCellsIcon, ChartBarIcon } from "@heroicons/react/20/solid"


export const view = ({ moduleContext, workbenchServices }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const selectedEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);
    const selectedEnsemble = selectedEnsembles?.[0] ?? { caseName: null, caseUuid: null, ensembleName: null };
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const [showLabels, setShowLabels] = React.useState(true);
    const [hideZeroY, setHideZeroY] = React.useState(false);
    const [showRealizationPoints, setShowRealizationPoints] = React.useState(false);
    const [settingsIsOpen, setSettingsIsOpen] = React.useState(false);


    // This is the output slot
    const setSelectedSensitivity = moduleContext.useSetStoreValue("selectedSensitivity");


    const togglePlotType = () => {
        if (plotType === PlotType.TORNADO) {
            setPlotType(PlotType.TABLE);
        } else {
            setPlotType(PlotType.TORNADO);
        }
    }

    //TEMPORARY QUERIES
    //This should be provided as a input slot
    const inplaceResponseQuery = useInplaceResponseQuery(
        selectedEnsemble?.caseUuid || "",
        selectedEnsemble?.ensembleName || "",
        "geogrid",
        "STOIIP_OIL"
    );

    // This should be provided from workbench
    const sensitivitiesQuery = useGetSensitivities(
        selectedEnsemble?.caseUuid || "",
        selectedEnsemble?.ensembleName || "",
    );


    // Memoize the computation of sensitivity responses
    const computedSensitivityResponseDataset = React.useMemo(() => {
        if (sensitivitiesQuery.data && inplaceResponseQuery.data) {
            inplaceResponseQuery.data.unit = "Sm³"
            inplaceResponseQuery.data.name = "STOIIP_OIL"
            const sensitivityAccessor = new SensitivityAccessor(sensitivitiesQuery.data, inplaceResponseQuery.data);
            return sensitivityAccessor.computeSensitivitiesForResponse();
        }
        return null;
    }, [sensitivitiesQuery.data, inplaceResponseQuery.data]);

    return (
        <div className="w-full h-full" >
            <div >
                <div >
                    <div className="flex justify-end space-x-2">
                        <button onClick={togglePlotType} className="p-2 bg-indigo-600 text-white rounded-md">
                            {plotType == PlotType.TORNADO ? <TableCellsIcon title="Show table" className="h-5 w-5" /> : <ChartBarIcon title="Show tornado" className="h-5 w-5" />}
                        </button>
                        <button
                            className="p-2 bg-indigo-600 text-white rounded-md"
                            onClick={() => setSettingsIsOpen(!settingsIsOpen)}>
                            <AdjustmentsHorizontalIcon title="Show no impact sensitivities" className="h-5 w-5" />
                        </button>
                    </div>

                    {settingsIsOpen && (
                        <div
                            className="origin-top-right absolute right-0 mt-1 z-10 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-1 focus:outline-none"
                            role="menu"
                            aria-orientation="vertical"
                            aria-labelledby="menu-button"
                            tabIndex={-1}
                        >
                            <div className="py-1" role="none">
                                <button onClick={() => setHideZeroY(!hideZeroY)} className="text-gray-700 block px-4 py-2 text-sm" role="menuitem">
                                    {hideZeroY ? 'Show no impact sensitivities' : 'Hide no impact sensitivities'}
                                </button>

                                {PlotType.TORNADO === plotType &&
                                    <>
                                        <button onClick={() => setShowLabels(!showLabels)} className="text-gray-700 block px-4 py-2 text-sm" role="menuitem">
                                            {showLabels ? 'Hide labels' : 'Show labels'}
                                        </button>

                                        <button onClick={() => setShowRealizationPoints(!showRealizationPoints)} className="text-gray-700 block px-4 py-2 text-sm" role="menuitem">
                                            {showRealizationPoints ? 'Hide realization points' : 'Show realization points'}
                                        </button>
                                    </>
                                }
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div ref={wrapperDivRef} className="w-full h-full">
                {computedSensitivityResponseDataset && plotType === PlotType.TORNADO &&
                    <SensitivityChart
                        sensitivityResponseDataset={computedSensitivityResponseDataset}
                        width={wrapperDivSize.width}
                        height={wrapperDivSize.height}
                        showLabels={showLabels}
                        hideZeroY={hideZeroY}
                        showRealizationPoints={showRealizationPoints}
                        onSelectedSensitivity={setSelectedSensitivity}

                    />}
                {computedSensitivityResponseDataset && plotType === PlotType.TABLE &&
                    <div className="text-sm">
                        <SensitivityTable sensitivityResponseDataset={computedSensitivityResponseDataset} onSelectedSensitivity={setSelectedSensitivity} hideZeroY={hideZeroY} />
                    </div>}
            </div>
        </div>
    );
};
