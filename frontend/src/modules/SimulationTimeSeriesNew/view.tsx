import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";

import { Layout } from "plotly.js";

import { useVectorDataQueries } from "./queryHooks";
import { GroupBy, State } from "./state";
import {
    createLoadedVectorSpecificationAndRealizationDataArray,
    createTimeSeriesPlotDataArray,
} from "./utils/plotUtils";

export const view = ({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) => {
    // const ensembleSet = useEnsembleSet(workbenchSession);
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    // State
    const vectorSpecifications = moduleContext.useStoreValue("vectorSpecifications");
    const groupBy = moduleContext.useStoreValue("groupBy");
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency");
    const showStatistics = moduleContext.useStoreValue("showStatistics");
    const realizationsToInclude = moduleContext.useStoreValue("realizationsToInclude");
    const statisticsToInclude = moduleContext.useStoreValue("statisticsToInclude");

    // QUERIES
    const vectorDataQueries = useVectorDataQueries(vectorSpecifications, resampleFrequency, realizationsToInclude);

    // Map vector specifications and queries
    const loadedVectorSpecificationsAndRealizationData = vectorSpecifications
        ? createLoadedVectorSpecificationAndRealizationDataArray(vectorSpecifications, vectorDataQueries)
        : [];

    // DATA TYPES/CALCULATIONS
    const numPlotGridRows = groupBy === GroupBy.Ensemble && vectorSpecifications ? numberOfSelectedEnsembles() : 1;

    // Layout for plot
    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        margin: { t: 0, r: 0, l: 40, b: 40 },
        grid: { rows: numPlotGridRows, columns: 1, pattern: "coupled" },
    };

    // Create plot traces
    const timeSeriesPlotDataArray = createTimeSeriesPlotDataArray(loadedVectorSpecificationsAndRealizationData);

    // Create plot statistics traces

    // Handler methods
    function handleHover() {
        return;
    }

    function handleUnHover() {
        return;
    }

    // TODO: Keep uirevision?
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <Plot
                data={timeSeriesPlotDataArray}
                layout={layout}
                config={{ scrollZoom: true }}
                onHover={handleHover}
                onUnhover={handleUnHover}
            />
        </div>
    );
};

function numberOfSelectedEnsembles(): number {
    return 1;
}
