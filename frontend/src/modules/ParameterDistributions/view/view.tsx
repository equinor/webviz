import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";

import type { Interfaces } from "../interfaces";
import { EnsembleMode } from "../typesAndEnums";

import { VirtualizedParameterDistributionPlot } from "./components/VirtualizedParameterDistributionPlot";
import { makeEnsembleSetParameterArray } from "./utils/ensembleSetParameterArray";
import { sortPriorPosteriorParameters } from "./utils/parameterSorting";

export function View(props: ModuleViewProps<Interfaces>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const independentEnsembleIdents = props.viewContext.useSettingsToViewInterfaceValue("selectedEnsembleIdents");
    const parameterIdents = props.viewContext.useSettingsToViewInterfaceValue("selectedParameterIdents");
    const visualizationType = props.viewContext.useSettingsToViewInterfaceValue("selectedVisualizationType");
    const ensembleMode = props.viewContext.useSettingsToViewInterfaceValue("ensembleMode");
    const parameterSortingMethod = props.viewContext.useSettingsToViewInterfaceValue("parameterSortingMethod");
    const priorEnsembleIdent = props.viewContext.useSettingsToViewInterfaceValue("priorEnsembleIdent");
    const posteriorEnsembleIdent = props.viewContext.useSettingsToViewInterfaceValue("posteriorEnsembleIdent");
    const showIndividualRealizationValues = props.viewContext.useSettingsToViewInterfaceValue(
        "showIndividualRealizationValues",
    );
    const showPercentilesAndMeanLines =
        props.viewContext.useSettingsToViewInterfaceValue("showPercentilesAndMeanLines");

    const ensembleSet = props.workbenchSession.getEnsembleSet();
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);
    let selectedEnsembleIdents: RegularEnsembleIdent[] = [];
    if (ensembleMode === EnsembleMode.INDEPENDENT) {
        selectedEnsembleIdents = independentEnsembleIdents;
    } else if (ensembleMode === EnsembleMode.PRIOR_POSTERIOR && priorEnsembleIdent && posteriorEnsembleIdent) {
        selectedEnsembleIdents = [priorEnsembleIdent, posteriorEnsembleIdent];
    }

    let ensembleSetParameterArray = makeEnsembleSetParameterArray(
        ensembleSet,
        selectedEnsembleIdents,
        parameterIdents,
        filterEnsembleRealizationsFunc,
    );

    ensembleSetParameterArray = sortPriorPosteriorParameters(ensembleSetParameterArray, parameterSortingMethod);

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <VirtualizedParameterDistributionPlot
                key={`param-plots-${ensembleSetParameterArray.length}`}
                dataArr={ensembleSetParameterArray}
                plotType={visualizationType}
                showIndividualRealizationValues={showIndividualRealizationValues}
                showPercentilesAndMeanLines={showPercentilesAndMeanLines}
                width={wrapperDivSize.width}
                height={wrapperDivSize.height}
            ></VirtualizedParameterDistributionPlot>
        </div>
    );
}
