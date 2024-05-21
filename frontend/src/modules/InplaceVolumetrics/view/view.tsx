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

import { InplaceHistogramPlot, InplaceResultValues, addHistogramTrace } from "./components/inplaceHistogramPlot";
import { useInplaceDataResultsQuery } from "./hooks/queryHooks";

import { Interface } from "../settingsToViewInterface";
import { State } from "../state";
import { InplaceVolGroupedResultValues, getGroupedInplaceVolResults } from "../utils/inplaceVolDataEnsembleSetAccessor";

export function View(props: ModuleViewProps<State, Interface>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const selectedEnsembleIdents = props.viewContext.useSettingsToViewInterfaceValue("selectedEnsembleIdents");
    const realizationFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);
    const ensembleIdentsWithRealizations = selectedEnsembleIdents.map((ensembleIdent) => {
        const realizations = realizationFilterFunc(ensembleIdent).map((realization) => realization);
        return { ensembleIdent, realizations };
    });
    const selectedInplaceTableName = props.viewContext.useSettingsToViewInterfaceValue("selectedInplaceTableName");
    const selectedInplaceResponseName =
        props.viewContext.useSettingsToViewInterfaceValue("selectedInplaceResponseName");

    const selectedInplaceIndexesValues = props.viewContext.useSettingsToViewInterfaceValue("selectedInplaceCategories");

    const inplaceDataSetResultQuery = useInplaceDataResultsQuery(
        ensembleIdentsWithRealizations,
        selectedInplaceTableName,
        selectedInplaceResponseName as InplaceVolumetricResponseNames_api,
        selectedInplaceIndexesValues
    );

    const colorBy = props.viewContext.useSettingsToViewInterfaceValue("colorBy");
    const groupBy = props.viewContext.useSettingsToViewInterfaceValue("groupBy");

    const data: InplaceVolGroupedResultValues[] = inplaceDataSetResultQuery.someQueriesFailed
        ? []
        : getGroupedInplaceVolResults(
              inplaceDataSetResultQuery.ensembleSetData,
              selectedInplaceIndexesValues,
              groupBy,
              colorBy
          );

    const resultValues: InplaceResultValues = {
        groupByName: groupBy,
        colorByName: colorBy,
        groupedValues: data,
    };
    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <InplaceHistogramPlot
                resultValues={resultValues}
                width={wrapperDivSize.width}
                height={wrapperDivSize.height}
            />
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
