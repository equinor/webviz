import React from "react";

import { Genre, Type } from "@framework/DataChannelTypes";
import { Ensemble } from "@framework/Ensemble";
import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";
import { BarChart, TableChart, Tune } from "@mui/icons-material";

import { isEqual } from "lodash";

import SensitivityChart from "./sensitivityChart";
import {
    EnsembleScalarResponse,
    SensitivityResponseCalculator,
    SensitivityResponseDataset,
} from "./sensitivityResponseCalculator";
import SensitivityTable from "./sensitivityTable";
import { PlotType, State } from "./state";

import { createSensitivityColorMap } from "../_shared/sensitivityColors";

export const view = ({ moduleContext, workbenchSession, workbenchSettings, initialSettings }: ModuleFCProps<State>) => {
    // Leave this in until we get a feeling for React18/Plotly
    const renderCount = React.useRef(0);
    React.useEffect(function incrementRenderCount() {
        renderCount.current = renderCount.current + 1;
    });

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const ensembleSet = useEnsembleSet(workbenchSession);
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const referenceSensitivityName = moduleContext.useStoreValue("referenceSensitivityName");
    const [channelEnsemble, setChannelEnsemble] = React.useState<Ensemble | null>(null);
    const [channelResponseData, setChannelResponseData] = React.useState<EnsembleScalarResponse | null>(null);
    const [availableSensitivityNames, setAvailableSensitivityNames] = moduleContext.useStoreState("sensitivityNames");

    const responseSubscriber = moduleContext.useSubscriber({
        subscriberIdent: "response",
        expectedGenres: [Genre.Realization],
        expectedValueType: Type.Number,
        initialSettings,
    });

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
    };

    const realizations: number[] = [];
    const values: number[] = [];
    if (responseSubscriber.hasActiveSubscription && responseSubscriber.channel.contents.length > 0) {
        const data = responseSubscriber.channel.contents[0].dataArray;
        if (data) {
            data.forEach((el) => {
                realizations.push(el.key as number);
                values.push(el.value as number);
            });
        }
    }

    const sensitivities = channelEnsemble?.getSensitivities();
    React.useEffect(
        function propogateSensitivityNamesToSettings() {
            const sensitivityNames = sensitivities?.getSensitivityNames().sort() ?? [];
            if (!isEqual(sensitivityNames, availableSensitivityNames)) {
                setAvailableSensitivityNames(sensitivityNames);
            }
        },
        [sensitivities]
    );
    const colorSet = workbenchSettings.useColorSet();
    const sensitivitiesColorMap = createSensitivityColorMap(
        sensitivities?.getSensitivityNames().sort() ?? [],
        colorSet
    );

    let computedSensitivityResponseDataset: SensitivityResponseDataset | null = null;
    if (referenceSensitivityName && sensitivities && realizations.length > 0 && values.length > 0) {
        // How to handle errors?

        try {
            const sensitivityResponseCalculator = new SensitivityResponseCalculator(
                sensitivities,
                {
                    realizations,
                    values,
                    name: responseSubscriber.channel?.contents[0].name ?? "",
                    unit: "",
                },
                referenceSensitivityName
            );
            computedSensitivityResponseDataset = sensitivityResponseCalculator.computeSensitivitiesForResponse();
        } catch (e) {
            console.warn(e);
        }
    }

    let errMessage = "";
    if (!computedSensitivityResponseDataset) {
        if (!responseSubscriber.hasActiveSubscription) {
            errMessage = "Select a data channel to plot";
        } else {
            errMessage = `No data received on channel ${responseSubscriber.channel.name}`;
        }
    }

    return (
        <div className="w-full h-full">
            {/* // TODO: Remove */}
            {!computedSensitivityResponseDataset && <div>{errMessage}</div>}

            <div>
                <div>
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={togglePlotType}
                            className="p-2 bg-indigo-600 text-white rounded-md"
                            title={plotType == PlotType.TORNADO ? "Show table" : "Show tornado"}
                        >
                            {plotType == PlotType.TORNADO ? (
                                <TableChart fontSize="small" />
                            ) : (
                                <BarChart fontSize="small" />
                            )}
                        </button>
                        <button
                            className="p-2 bg-indigo-600 text-white rounded-md"
                            onClick={() => setSettingsIsOpen(!settingsIsOpen)}
                            title="Show no impact sensitivities"
                        >
                            <Tune fontSize="small" />
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
                                <button
                                    onClick={() => setHideZeroY(!hideZeroY)}
                                    className="text-gray-700 block px-4 py-2 text-sm"
                                    role="menuitem"
                                >
                                    {hideZeroY ? "Show no impact sensitivities" : "Hide no impact sensitivities"}
                                </button>

                                {PlotType.TORNADO === plotType && (
                                    <>
                                        <button
                                            onClick={() => setShowLabels(!showLabels)}
                                            className="text-gray-700 block px-4 py-2 text-sm"
                                            role="menuitem"
                                        >
                                            {showLabels ? "Hide labels" : "Show labels"}
                                        </button>

                                        <button
                                            onClick={() => setShowRealizationPoints(!showRealizationPoints)}
                                            className="text-gray-700 block px-4 py-2 text-sm"
                                            role="menuitem"
                                        >
                                            {showRealizationPoints
                                                ? "Hide realization points"
                                                : "Show realization points"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div ref={wrapperDivRef} className="w-full h-full">
                {computedSensitivityResponseDataset && plotType === PlotType.TORNADO && (
                    <SensitivityChart
                        sensitivityResponseDataset={computedSensitivityResponseDataset}
                        sensitivityColorMap={sensitivitiesColorMap}
                        width={wrapperDivSize.width}
                        height={wrapperDivSize.height}
                        showLabels={showLabels}
                        hideZeroY={hideZeroY}
                        showRealizationPoints={showRealizationPoints}
                        onSelectedSensitivity={setSelectedSensitivity}
                    />
                )}
                {computedSensitivityResponseDataset && plotType === PlotType.TABLE && (
                    <div className="text-sm">
                        <SensitivityTable
                            sensitivityResponseDataset={computedSensitivityResponseDataset}
                            onSelectedSensitivity={setSelectedSensitivity}
                            hideZeroY={hideZeroY}
                        />
                    </div>
                )}
            </div>
            <div className="absolute top-10 left-5 italic text-pink-400">(rc={renderCount.current})</div>
        </div>
    );
};
