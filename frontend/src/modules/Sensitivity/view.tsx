import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import SensitivityChart from "./sensitivityChart";
import SensitivityTable from "./sensitivityTable";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useGetSensitivities, useInplaceResponseQuery } from "./queryHooks";
import { State, PlotType } from "./state";
import { SensitivityAccessor, SensitivityResponse } from "./sensitivityAccessor";
import { Ensemble } from "@shared-types/ensemble";
import { EyeIcon, EyeSlashIcon, ArrowDownIcon, ArrowUpIcon, EllipsisHorizontalIcon, TableCellsIcon, ChartBarIcon } from "@heroicons/react/20/solid";



export const view = ({ moduleContext, workbenchServices }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const selectedEnsembles = useSubscribedValue("navigator.ensembles", workbenchServices);

    const selectedEnsemble = selectedEnsembles?.[0] ?? { caseName: null, caseUuid: null, ensembleName: null };
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const setSelectedSensitivity = moduleContext.useSetStoreValue("selectedSensitivity");
    const [sensitivityResponses, setSensitivityResponses] = React.useState<SensitivityResponse[]>([]);
    const [showLabels, setShowLabels] = React.useState(true);
    const [hideZeroY, setHideZeroY] = React.useState(false);
    const [showRealizationPoints, setShowRealizationPoints] = React.useState(false);

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

    // This is the output slot
    const onSelectedSensitivity = (selectedSensitivity: string) => {
        if ((selectedEnsemble.caseName !== null) &&
            (selectedEnsemble.caseUuid !== null) &&
            (selectedEnsemble.ensembleName !== null) &&
            (selectedSensitivity !== null)) {
            setSelectedSensitivity({ selectedEnsemble: selectedEnsemble, selectedSensitivity: selectedSensitivity });
        }
    }

    // Memoize the computation of sensitivity responses
    const computedSensitivityResponses = React.useMemo(() => {
        if (sensitivitiesQuery.data && inplaceResponseQuery.data) {
            const sensitivityAccessor = new SensitivityAccessor(sensitivitiesQuery.data, inplaceResponseQuery.data);
            return sensitivityAccessor.computeSensitivityResponses();
        }
        return [];
    }, [sensitivitiesQuery.data, inplaceResponseQuery.data]);

    React.useEffect(() => {
        setSensitivityResponses(computedSensitivityResponses);
    }, [computedSensitivityResponses]);



    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <div className="flex flex-col">
                <div className="flex justify-end space-x-2 p-2">

                    <button onClick={togglePlotType} className="p-2 bg-indigo-600 text-white rounded-md">
                        {plotType == PlotType.TORNADO ? <TableCellsIcon title="Show table" className="h-5 w-5" /> : <ChartBarIcon title="Show tornado" className="h-5 w-5" />}
                    </button>

                    <button onClick={() => setShowLabels(!showLabels)} className="p-2 bg-indigo-600 text-white rounded-md">
                        {showLabels ? <EyeIcon title="Hide labels" className="h-5 w-5" /> : <EyeSlashIcon title="Show labels" className="h-5 w-5" />}
                    </button>

                    <button onClick={() => setHideZeroY(!hideZeroY)} className="p-2 bg-indigo-600 text-white rounded-md">
                        {hideZeroY ?
                            <ArrowDownIcon title="Show no impact sensitivities" className="h-5 w-5" /> :
                            <ArrowUpIcon title="Hide no impact sensitivities" className="h-5 w-5" />}
                    </button>

                    <button
                        onClick={() => setShowRealizationPoints(!showRealizationPoints)}
                        className={`p-2 rounded-md ${showRealizationPoints ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-indigo-600'}`}>

                        {showRealizationPoints ?
                            <EllipsisHorizontalIcon title="Hide realization points" className="h-5 w-5" /> :
                            <EllipsisHorizontalIcon title="Show realization points" className="h-5 w-5" />

                        }
                    </button>
                </div>

                {plotType === PlotType.TORNADO &&
                    <SensitivityChart
                        sensitivityResponses={sensitivityResponses}
                        width={wrapperDivSize.width}
                        height={wrapperDivSize.height}
                        showLabels={showLabels}
                        hideZeroY={hideZeroY}
                        showRealizationPoints={showRealizationPoints}
                        onSelectedSensitivity={onSelectedSensitivity}

                    />}
                {plotType === PlotType.TABLE &&
                    <SensitivityTable sensitivityResponses={sensitivityResponses} onSelectedSensitivity={onSelectedSensitivity} hideZeroY={hideZeroY} />}
            </div>
        </div>
    );
};
