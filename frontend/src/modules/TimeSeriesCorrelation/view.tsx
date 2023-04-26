import React from "react";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { useCorrelationsQuery, useParameterQuery, useVectorDataQuery, useVectorAtTimestepQuery } from "./queryHooks";
import { State } from "./state";
import PlotlyTimeSeries from "./plotlyTimeSeriesChart"
import PlotlyCorrelation from "./plotlyCorrelationChart";
import PlotlyDistribution from "./plotlyDistributionChart";

export const view = ({ moduleContext, workbenchServices }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const vectorSpec = moduleContext.useStoreValue("vectorSpec");
    const resampleFrequency = moduleContext.useStoreValue("resamplingFrequency");
    const realizationsToInclude = moduleContext.useStoreValue("realizationsToInclude");
    const [timeStep, setTimeStep] = moduleContext.useStoreState("timeStep");
    const [parameterName, setParameterName] = moduleContext.useStoreState("parameterName");
    const [highlightedRealization, setHighlightedRealization] = React.useState(-1)

    const vectorQuery = useVectorDataQuery(
        vectorSpec?.caseUuid,
        vectorSpec?.ensembleName,
        vectorSpec?.vectorName,
        resampleFrequency,
        realizationsToInclude
    );
    const vectorAtTimestepQuery = useVectorAtTimestepQuery(
        vectorSpec?.caseUuid,
        vectorSpec?.ensembleName,
        vectorSpec?.vectorName,
        timeStep
    );
    const correlationQuery = useCorrelationsQuery(
        vectorSpec?.caseUuid,
        vectorSpec?.ensembleName,
        vectorSpec?.vectorName,
        timeStep
    )
    const parameterQuery = useParameterQuery(
        vectorSpec?.caseUuid,
        vectorSpec?.ensembleName,
        parameterName,
    )
    const handleClickedDate = (date: any) => {
        const dateString = new Date(date || 0).toISOString().split("T")[0] + "T00:00:00"
        setTimeStep(dateString)
    };
    const handleClickedParameter = (xy: any) => {
        setParameterName(xy[1])
    };
    const handleHoveredRealization = (real: any) => {
        setHighlightedRealization(real)
    }
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {vectorQuery.data &&
                <PlotlyTimeSeries
                    vectorRealizationsData={vectorQuery.data}
                    width={wrapperDivSize.width / 2}
                    height={wrapperDivSize.height / 2}
                    highlightedRealization={highlightedRealization}
                    onClickData={handleClickedDate}
                    onHoverData={handleHoveredRealization}
                />
            }
            {vectorQuery.data && correlationQuery.data &&
                <PlotlyCorrelation
                    ensembleCorrelations={correlationQuery.data}
                    width={wrapperDivSize.width / 2}
                    height={wrapperDivSize.height / 2}
                    selectedParameterName={parameterName}
                    onClickData={handleClickedParameter}
                />
            }
            {parameterQuery.data && vectorAtTimestepQuery.data &&
                <PlotlyDistribution
                    x={parameterQuery.data.values as number[]}
                    y={vectorAtTimestepQuery.data.values as number[]}
                    realizations={parameterQuery.data.realizations as number[]}
                    highlightedRealization={highlightedRealization}
                    onHoverData={handleHoveredRealization}
                    width={wrapperDivSize.width / 2}
                    height={wrapperDivSize.height / 2}
                />
            }
        </div>
    );
};
