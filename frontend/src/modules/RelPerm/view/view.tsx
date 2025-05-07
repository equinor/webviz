import React from "react";
import Plot from "react-plotly.js";

import { RelPermRealizationData_api } from "@api";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";
import { hexToRgb } from "@mui/system";

import { Color, Rgb, parseHex } from "culori";
import { useAtomValue } from "jotai";
import { PlotData } from "plotly.js";

import { visualizationSettingsAtom } from "./atoms/baseAtoms";
import { loadedRelPermSpecificationsAndRealizationDataAtom } from "./atoms/derivedAtoms";

import { Interfaces } from "../interfaces";
import { RelPermSpec, VisualizationSettings } from "../typesAndEnums";

export const View = ({ viewContext, workbenchSettings, workbenchSession }: ModuleViewProps<Interfaces>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const ensembleSet = useEnsembleSet(workbenchSession);
    const colorSet = workbenchSettings.useColorSet();

    const loadedRelPermSpecificationsAndRealizationData = useAtomValue(
        loadedRelPermSpecificationsAndRealizationDataAtom,
    );

    const statusWriter = useViewStatusWriter(viewContext);
    const visualizationSettings = useAtomValue(visualizationSettingsAtom);

    let content = null;
    let plotData: Partial<PlotData>[] = [];

    plotData = createRealizationsTraces(
        loadedRelPermSpecificationsAndRealizationData,
        ensembleSet,
        visualizationSettings,
    );

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
        data: RelPermRealizationData_api[];
    }[],
    ensembleSet: EnsembleSet,
    visualizationSettings: VisualizationSettings,
): Partial<PlotData>[] {
    const plotData: Partial<PlotData>[] = [];

    let totalPoints = 0;
    relPermSpecAndRealizationData.forEach((relPermSpec) => {
        relPermSpec.data.forEach((realizationData) => {
            realizationData.curve_data_arr.forEach((curveData) => {
                totalPoints += curveData.curve_values.length;
            });
        });
    });

    const useGl: boolean = totalPoints > 1000;
    const curveNames = new Set(
        relPermSpecAndRealizationData.map((relPermSpec) => {
            return relPermSpec.relPermSpecification.curveNames;
        }),
    );

    relPermSpecAndRealizationData.forEach((relPermSpec) => {
        const ensemble = ensembleSet.getEnsemble(relPermSpec.relPermSpecification.ensembleIdent);
        const color = ensemble.getColor();
        const rgbColor: Rgb = parseHex(color) as Rgb;
        console.log("rgbColor", rgbColor);
        relPermSpec.data.forEach((realizationData) => {
            realizationData.curve_data_arr.forEach((curve) => {
                plotData.push(
                    createRelPermRealizationTrace(
                        realizationData.realization_id,
                        realizationData.saturation_values,
                        curve.curve_values,
                        useGl,
                        visualizationSettings.opacity,
                        visualizationSettings.lineWidth,
                        rgbColor,
                    ),
                );
            });
        });
    });
    return plotData;
}

function createRelPermRealizationTrace(
    realization: number,
    saturationValues: number[],
    curveValues: number[],
    useGl: boolean,
    opacity: number,
    lineWidth: number,
    color: Rgb,
): Partial<PlotData> {
    const trace: Partial<PlotData> = {
        x: saturationValues,
        y: curveValues,

        type: useGl ? "scattergl" : "scatter",
        mode: "lines",
        showlegend: false,
        line: {
            width: lineWidth,
        },
        marker: {
            color: `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`,
        },
        hovertext: `Realization: ${realization}`,
    };
    return trace;
}
