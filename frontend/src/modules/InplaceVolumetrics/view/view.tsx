import React from "react";
import Plot from "react-plotly.js";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleViewProps } from "@framework/Module";
import { EnsembleRealizationFilterFunction, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorSet } from "@lib/utils/ColorSet";
import { computeQuantile } from "@modules/_shared/statistics";

import { group } from "console";

import { InplaceHistogramPlot } from "./components/inplaceHistogramPlot";

import { Interface } from "../settingsToViewInterface";
import { State } from "../state";
import { PlotGroupingEnum } from "../typesAndEnums";

export function View(props: ModuleViewProps<State, Interface>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const colorBy = props.viewContext.useSettingsToViewInterfaceValue("colorBy");
    const groupBy = props.viewContext.useSettingsToViewInterfaceValue("groupBy");
    const selectedEnsembleIdents = props.viewContext.useSettingsToViewInterfaceValue("selectedEnsembleIdents");
    const selectedInplaceCategories = props.viewContext.useSettingsToViewInterfaceValue("selectedInplaceCategories");
    const inplaceDataSetResultQuery = props.viewContext.useSettingsToViewInterfaceValue("inplaceTableDataSetQuery");
    let numSubplots = 1;
    if (groupBy === PlotGroupingEnum.ENSEMBLE) {
        numSubplots = selectedEnsembleIdents.length;
    }
    if (groupBy === PlotGroupingEnum.ZONE) {
        numSubplots =
            selectedInplaceCategories.find((category) => category.category_name === "ZONE")?.unique_values.length || 1;
    }
    if (groupBy === PlotGroupingEnum.REGION) {
        numSubplots =
            selectedInplaceCategories.find((category) => category.category_name === "REGION")?.unique_values.length ||
            1;
    }

    const numColumns = Math.ceil(Math.sqrt(numSubplots));
    const numRows = Math.ceil(numSubplots / numColumns);

    console.log(inplaceDataSetResultQuery);
    const ensembleSet = props.workbenchSession.getEnsembleSet();

    const colorSet = props.workbenchSettings.useColorSet();
    const ensembleColors = getEnsembleColors(ensembleSet, colorSet);

    const resultValues: number[] = inplaceDataSetResultQuery.dataCollections
        .map((ensembleResults) => ensembleResults.tableData?.entries.map((entry) => entry.value) || [])
        .flat();

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <InplaceHistogramPlot
                values={resultValues}
                width={wrapperDivSize.width}
                height={wrapperDivSize.height}
                colorBy={colorBy}
                groupBy={groupBy}
            />
        </div>
    );
}

function getEnsembleColors(ensembleSet: EnsembleSet, colorSet: ColorSet) {
    const ensembleColors = new Map<string, string>();
    ensembleSet.getEnsembleArr().forEach((ensemble, index) => {
        const color = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
        ensembleColors.set(ensemble.getDisplayName(), color);
    });
    return ensembleColors;
}
