import React from "react";
import Plot from "react-plotly.js";

import {
    RelPermRealizationCurveData_api,
    RelPermRealizationData_api,
    RelPermStatisticalDataForSaturation_api,
    RftRealizationData_api,
} from "@api";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ContentMessage, ContentMessageType } from "@modules/_shared/components/ContentMessage/contentMessage";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { ConstructionOutlined } from "@mui/icons-material";

import { useAtomValue } from "jotai";
import { PlotData } from "plotly.js";
import { vi } from "vitest";

import {
    loadedRelPermSpecificationsAndRealizationDataAtom,
    loadedRelPermSpecificationsAndStatisticalDataAtom,
} from "./atoms/derivedAtoms";
import { createRelPermFanchartTraces } from "./utils/createRelPermTracesUtils";

import { Interfaces } from "../interfaces";
import { RelPermSpec, VisualizationType } from "../typesAndEnums";

export const View = ({ viewContext }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const visualizationType = viewContext.useSettingsToViewInterfaceValue("visualizationType");
    const loadedRelPermSpecificationsAndRealizationData = useAtomValue(
        loadedRelPermSpecificationsAndRealizationDataAtom,
    );
    const loadedRelPermSpecificationsAndStatisticalData = useAtomValue(
        loadedRelPermSpecificationsAndStatisticalDataAtom,
    );
    const statusWriter = useViewStatusWriter(viewContext);

    let content = null;
    let plotData: Partial<PlotData>[] = [];
    if (visualizationType === VisualizationType.INDIVIDUAL_REALIZATIONS) {
        plotData = createRealizationsTraces(loadedRelPermSpecificationsAndRealizationData);
    }

    content = (
        <Plot
            key={plotData.length} // Note: Temporary to trigger re-render and remove legends when plotData is empty
            data={plotData}
            layout={{
                title: "Relative Permeability",
                height: wrapperDivSize.height,
                width: wrapperDivSize.width,
                xaxis: { range: [0, 1] },
                // yaxis: { autorange: "reversed", title: "Depth" },
            }}
            config={{ scrollZoom: true }}
        />
    );

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {content}
        </div>
    );
};
function createRealizationsTraces(
    relPermSpecAndRealizationData: {
        relPermSpecification: RelPermSpec;
        data: RelPermRealizationData_api;
    }[],
): Partial<PlotData>[] {
    const plotData: Partial<PlotData>[] = [];

    let totalPoints = 0;
    relPermSpecAndRealizationData.forEach((realizationData) => {
        totalPoints += realizationData.data.relperm_curve_data.length;
    });

    const useGl: boolean = totalPoints > 1000;
    const curveNames = new Set(
        relPermSpecAndRealizationData.map((real) => {
            return real.data.relperm_curve_data.map((data) => data.curve_name);
        }),
    );

    relPermSpecAndRealizationData.forEach((real) => {
        real.data.relperm_curve_data.forEach((realizationData) => {
            plotData.push(
                createRelPermRealizationTrace(
                    realizationData.realization_id,
                    real.data.saturation_axis_data.curve_values,
                    realizationData.curve_values,
                    useGl,
                ),
            );
        });
    });
    return plotData;
}

function createRelPermRealizationTrace(
    realization: number,
    saturationValues: number[],
    curveValues: number[],
    useGl: boolean,
): Partial<PlotData> {
    const trace: Partial<PlotData> = {
        x: saturationValues,
        y: curveValues,

        type: useGl ? "scatter" : "scatter",
        mode: "lines+markers",
        showlegend: false,
        line: {
            width: 1,
        },
        marker: {
            color: "blue",
            size: 5,
        },
        hovertext: `Realization: ${realization}`,
    };
    return trace;
}

// function getResponseValueRange(rftRealizationData: RftRealizationData_api[] | null): [number, number] {
//     let minValue = Number.POSITIVE_INFINITY;
//     let maxValue = Number.NEGATIVE_INFINITY;
//     if (rftRealizationData !== null && rftRealizationData.length) {
//         rftRealizationData.forEach((realizationData) => {
//             realizationData.value_arr.forEach((value) => {
//                 if (value < minValue) {
//                     minValue = value;
//                 }
//                 if (value > maxValue) {
//                     maxValue = value;
//                 }
//             });
//         });
//     }
//     return [minValue, maxValue];
// }
