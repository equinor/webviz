import React from "react";

import { BroadcastChannelMeta } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { AdjustmentsHorizontalIcon, ChartBarIcon, TableCellsIcon } from "@heroicons/react/20/solid";
import { useElementSize } from "@lib/hooks/useElementSize";

import SensitivityChart from "./sensitivityChart";
import { SensitivityResponseCalculator } from "./sensitivityResponseCalculator";
import SensitivityTable from "./sensitivityTable";
import { PlotType, State } from "./state";

export const view = ({ moduleContext, workbenchSession, initialSettings }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const firstEnsemble = useFirstEnsembleInEnsembleSet(workbenchSession);
    const [plotType, setPlotType] = moduleContext.useStoreState("plotType");
    const [responseData, setResponseData] = React.useState<any | null>(null);

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

    const responseChannel = moduleContext.useInputChannel("response", initialSettings);

    React.useEffect(() => {
        if (!responseChannel) {
            setResponseData(null);
            return;
        }

        const handleResponseChanged = (data: any | null, metaData: BroadcastChannelMeta | null) => {
            const realizations: number[] = [];
            const values: number[] = [];
            data.forEach((vec: any) => {
                realizations.push(vec.key);
                values.push(vec.value);
            });

            if (data && metaData) {
                setResponseData({
                    realizations: realizations,
                    values: values,
                    name: metaData.description,
                    unit: metaData.unit,
                });
            } else {
                setResponseData(null);
            }
        };

        const unsubscribeFunc = responseChannel.subscribe(handleResponseChanged);

        return unsubscribeFunc;
    }, [responseChannel]);

    // Memoize the computation of sensitivity responses. Should we use useMemo?
    const sensitivities = firstEnsemble?.getSensitivities();
    const computedSensitivityResponseDataset = React.useMemo(() => {
        if (sensitivities && responseData) {
            // How to handle errors?
            try {
                const sensitivityResponseCalculator = new SensitivityResponseCalculator(sensitivities, responseData);
                return sensitivityResponseCalculator.computeSensitivitiesForResponse();
            } catch (e) {
                console.warn(e);
                return null;
            }
        }
        return null;
    }, [sensitivities, responseData]);

    return (
        <div className="w-full h-full">
            {/* // TODO: Remove */}
            {!computedSensitivityResponseDataset && <div>No channels selected</div>}

            <div>
                <div>
                    <div className="flex justify-end space-x-2">
                        <button onClick={togglePlotType} className="p-2 bg-indigo-600 text-white rounded-md">
                            {plotType == PlotType.TORNADO ? (
                                <TableCellsIcon title="Show table" className="h-5 w-5" />
                            ) : (
                                <ChartBarIcon title="Show tornado" className="h-5 w-5" />
                            )}
                        </button>
                        <button
                            className="p-2 bg-indigo-600 text-white rounded-md"
                            onClick={() => setSettingsIsOpen(!settingsIsOpen)}
                        >
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
        </div>
    );
};
