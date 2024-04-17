import React from "react";
import Plot from "react-plotly.js";

import { InplaceVolumetricData_api, InplaceVolumetricResponseNames_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleViewProps } from "@framework/Module";
import { EnsembleRealizationFilterFunction, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorSet } from "@lib/utils/ColorSet";
import { makeSubplots } from "@modules/_shared/Figure";
import { computeQuantile } from "@modules/_shared/statistics";

import { group } from "console";

import { HistogramPlotData, InplaceHistogramPlot, addHistogramTrace } from "./components/inplaceHistogramPlot";
import { useInplaceDataResultsQuery } from "./hooks/queryHooks";

import { Interface } from "../settingsToViewInterface";
import { State } from "../state";
import { PlotGroupingEnum } from "../typesAndEnums";

export function View(props: ModuleViewProps<State, Interface>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const colorBy = props.viewContext.useSettingsToViewInterfaceValue("colorBy");
    const groupBy = props.viewContext.useSettingsToViewInterfaceValue("groupBy");
    const selectedEnsembleIdents = props.viewContext.useSettingsToViewInterfaceValue("selectedEnsembleIdents");
    const selectedInplaceTableName = props.viewContext.useSettingsToViewInterfaceValue("selectedInplaceTableName");
    const selectedInplaceResponseName =
        props.viewContext.useSettingsToViewInterfaceValue("selectedInplaceResponseName");
    const selectedInplaceCategories = props.viewContext.useSettingsToViewInterfaceValue("selectedInplaceCategories");

    const ensembleIdentsWithRealizations = selectedEnsembleIdents.map((ensembleIdent) => {
        const realizationFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);
        const realizations = realizationFilterFunc(ensembleIdent).map((realization) => realization);
        return { ensembleIdent, realizations };
    });
    const inplaceDataSetResultQuery = useInplaceDataResultsQuery(
        ensembleIdentsWithRealizations,
        selectedInplaceTableName,
        selectedInplaceResponseName as InplaceVolumetricResponseNames_api,
        selectedInplaceCategories,
        groupBy,
        colorBy
    );
    const datasetResults: InplaceVolumetricData_api[] = [];
    for (const query of inplaceDataSetResultQuery) {
        if (query.isError) {
            console.error("Error in query", query.error);
        }
        if (query.data) {
            datasetResults.push(query.data);
        }
    }
    let numSubplots = 1;
    const data: number[] = [];
    if (groupBy === PlotGroupingEnum.ENSEMBLE) {
        numSubplots = selectedEnsembleIdents.length;
    }
    if (groupBy === PlotGroupingEnum.ZONE) {
        numSubplots = selectedInplaceCategories.find((index) => index.index_name === "ZONE")?.values.length || 1;
    }
    if (groupBy === PlotGroupingEnum.REGION) {
        numSubplots = selectedInplaceCategories.find((index) => index.index_name === "REGION")?.values.length || 1;
    }
    datasetResults.map((datasetResult) => {
        datasetResult.entries.map((entry) => {
            console.log(entry);
        });
    });
    const ensembleSet = props.workbenchSession.getEnsembleSet();

    const colorSet = props.workbenchSettings.useColorSet();
    const ensembleColors = getEnsembleColors(ensembleSet, colorSet);

    const subplotData: (GroupedInplaceData | null)[] = [];
    console.log(inplaceDataSetResultQuery);
    // if (groupBy === PlotGroupingEnum.None) {
    //     const values: number[] = [];
    //     const realizations: number[] = [];
    //     datasetResults.forEach((datasetResult) =>
    //         datasetResult.entries.forEach((entry) => {
    //             entry.result_values.forEach((value) => values.push(value));
    //             entry.realizations.forEach((realization) => realizations.push(realization));
    //         })
    //     );
    //     subplotData.push({ realizations, values, plotLabel: "All", traceColor: "rgba(0,0,0,0.5)" });
    // }
    // if (groupBy === PlotGroupingEnum.ENSEMBLE) {
    //     selectedEnsembleIdents.forEach((ensembleIdent, i) => {
    //         const datasetResult = inplaceDataSetResultQuery[i];
    //         if (!datasetResult.data) {
    //             subplotData.push(null);
    //         } else {
    //             const dataResult = datasetResult.data;
    //             dataResult.entries.forEach((entry) => {
    //                 subplotData.push({
    //                     realizations: entry.realizations,
    //                     values: entry.result_values,
    //                     plotLabel: ensembleIdent.toString(),
    //                     traceColor: "rgba(0,0,0,0.5)",
    //                 });
    //             });
    //         }
    //     });
    // }
    console.log(subplotData);
    console.log(inplaceDataSetResultQuery);
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <InplaceHistogramPlot values={subplotData} width={wrapperDivSize.width} height={wrapperDivSize.height} />
        </div>
    );
}

export type GroupedInplaceData = {
    realizations: number[];
    values: number[];
    plotLabel: string;
    traceColor: string;
};

function getEnsembleColors(ensembleSet: EnsembleSet, colorSet: ColorSet) {
    const ensembleColors = new Map<string, string>();
    ensembleSet.getEnsembleArr().forEach((ensemble, index) => {
        const color = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
        ensembleColors.set(ensemble.getDisplayName(), color);
    });
    return ensembleColors;
}
