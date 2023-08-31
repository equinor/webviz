import React from "react";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import PlotlyScatter from "./plotlyScatterChart";

import { useVectorAtTimestampQuery, useParameterQuery } from "./queryHooks";
import { State } from "./state";


export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const vectorSpec = moduleContext.useStoreValue("vectorSpec");
    const [highlightedRealization, setHighlightedRealization] = React.useState(-1)
    const parameterName = moduleContext.useStoreValue("parameterName");
    const timestampUtcMs = moduleContext.useStoreValue("timestampUtcMs");

    const vectorAtTimestampQuery = useVectorAtTimestampQuery(
        vectorSpec?.caseUuid,
        vectorSpec?.ensembleName,
        vectorSpec?.vectorName,
        timestampUtcMs
    );

    const parameterQuery = useParameterQuery(
        vectorSpec?.caseUuid,
        vectorSpec?.ensembleName,
        parameterName,
    )

    const handleHoveredRealization = (real: any) => {
        setHighlightedRealization(real)
    }


    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {parameterQuery.data && vectorAtTimestampQuery.data &&
                <PlotlyScatter
                    x={parameterQuery.data.values as number[]}
                    y={vectorAtTimestampQuery.data.values as number[]}
                    realizations={parameterQuery.data.realizations as number[]}
                    highlightedRealization={highlightedRealization}
                    onHoverData={handleHoveredRealization}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                />
            }
        </div>
    );
};
