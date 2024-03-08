import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { TableHeading } from "@lib/components/Table/table";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentInfo } from "@modules/_shared/components/ContentMessage";

import { isEqual } from "lodash";
import { Layout, PlotData, Shape } from "plotly.js";

import { addHistogramTrace, addStatisticallines } from "./components/plotlyHistogram";
// import { ChannelDefs, Channels } from "./channelDefs";
import { useRealizationsResponses } from "./hooks/useRealizationResponses";
import { State } from "./state";
import { findValidRealizations } from "./utils/findValidRealizations";

export const view = (props: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const responseNames = props.moduleContext.useStoreValue("selectedResponseNames");
    const tableNames = props.moduleContext.useStoreValue("selectedTableNames");
    const ensembleIdents = props.moduleContext.useStoreValue("selectedEnsembleIdents");
    const categoricalMetadata = props.moduleContext.useStoreValue("selectedCategoricalMetadata");
    const ref = React.useRef<HTMLDivElement>(null);

    const statusWriter = useViewStatusWriter(props.moduleContext);
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const realizations: number[] = Array.from(findValidRealizations(ensembleIdents, ensembleSet).values());

    const tableData = useRealizationsResponses(ensembleIdents, tableNames, responseNames, realizations, {
        categorical_filter: categoricalMetadata,
    });

    statusWriter.setLoading(tableData.isFetching);

    // props.moduleContext.usePublish({
    //     dependencies: [tableData.data, tableData.isFetching],

    //     channelIdent: Channels.ResponseValuePerRealization,
    //     contents: responseNames.map((el) => ({ ident: el, name: el })),
    //     dataGenerator: (contentIdent: string) => {
    //         const data = tableData.data?.find((el) => el.responseName === contentIdent);
    //         if (data && data.responses) {
    //             return data.responses.realizations.map((el, index) => ({
    //                 key: el,
    //                 value: data.responses?.values[index] ?? 0,
    //             }));
    //         }
    //         return [];
    //     },
    // });

    const [tracesDataArr, setTracesDataArr] = React.useState<Partial<PlotData>[]>([]);
    const [shapes, setShapes] = React.useState<Partial<Shape>[]>([]);
    const [minValue, setMinValue] = React.useState<number>(0);
    const [maxValue, setMaxValue] = React.useState<number>(0);

    if (!tableData.isFetching && tableData.data) {
        const newTracesDataArr: Partial<PlotData>[] = [];
        const newShapes: Partial<Shape>[] = [];
        const newMinValue: number =
            tableData.data
                ?.map((responseData) => responseData.responses?.result_per_realization.map((realData) => realData[1]))
                .flat()
                .reduce((a, b) => Math.min(a, b), Infinity) ?? 0;
        const newMaxValue: number =
            tableData.data
                ?.map((responseData) => responseData.responses?.result_per_realization.map((realData) => realData[1]))
                .flat()
                .reduce((a, b) => Math.max(a, b), -Infinity) ?? 0;

        const tempColors = ["green", "red", "blue", "orange"];

        for (let i = 0; i < tableData.data.length; i++) {
            const responseData = tableData.data[i];
            const ensemble = responseData.ensembleIdent?.toString() ?? "";
            const table = responseData.tableName ?? "";
            const responseName = responseData.responseName ?? "";

            const resultValues: number[] = [];
            if (responseData.responses) {
                responseData.responses.result_per_realization.forEach((realData) => {
                    resultValues.push(realData[1]);
                });
            }
            newTracesDataArr.push(addHistogramTrace(resultValues, newMinValue, newMaxValue, tempColors[i]));
            newShapes.push(...addStatisticallines(resultValues, tempColors[i]));
        }
        if (!isEqual(tracesDataArr, newTracesDataArr)) {
            setTracesDataArr(newTracesDataArr);
        }
        if (!isEqual(shapes, newShapes)) {
            setShapes(newShapes);
        }
        if (minValue !== newMinValue) {
            setMinValue(newMinValue);
        }
        if (maxValue !== newMaxValue) {
            setMaxValue(newMaxValue);
        }
    }
    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        margin: { t: 0, r: 0, l: 40, b: 40 },
        xaxis: { title: "Realization", range: [minValue, maxValue] },
        shapes: shapes,
        barmode: "overlay",
    };
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <Plot
                data={tracesDataArr}
                layout={layout}
                config={{ scrollZoom: true }}
                // onHover={handleHover}
                // onUnhover={handleUnHover}
            />
        </div>
    );
};
