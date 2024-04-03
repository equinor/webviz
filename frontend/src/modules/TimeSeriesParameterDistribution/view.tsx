import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import PlotlyScatter from "./plotlyScatterChart";
import { useParameterQuery, useVectorAtTimestampQuery } from "./queryHooks";
import { State } from "./state";

export const View = ({ viewContext }: ModuleViewProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const vectorSpec = viewContext.useStoreValue("vectorSpec");
    const [highlightedRealization, setHighlightedRealization] = React.useState(-1);
    const parameterName = viewContext.useStoreValue("parameterName");
    const timestampUtcMs = viewContext.useStoreValue("timestampUtcMs");

    const vectorAtTimestampQuery = useVectorAtTimestampQuery(
        vectorSpec?.caseUuid,
        vectorSpec?.ensembleName,
        vectorSpec?.vectorName,
        timestampUtcMs
    );

    const parameterQuery = useParameterQuery(vectorSpec?.caseUuid, vectorSpec?.ensembleName, parameterName);

    const handleHoveredRealization = (real: any) => {
        setHighlightedRealization(real);
    };

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {parameterQuery.data && vectorAtTimestampQuery.data && (
                <PlotlyScatter
                    x={parameterQuery.data.values as number[]}
                    y={vectorAtTimestampQuery.data.values as number[]}
                    realizations={parameterQuery.data.realizations as number[]}
                    highlightedRealization={highlightedRealization}
                    onHoverData={handleHoveredRealization}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                />
            )}
        </div>
    );
};
