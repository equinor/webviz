import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent, ParameterType } from "@framework/EnsembleParameters";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleViewProps } from "@framework/Module";
import { EnsembleRealizationFilterFunction, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";

import { ParameterDistributionPlot } from "./components/ParameterDistributionPlot";

import { Interfaces } from "../interfaces";
import { ParameterDataArr } from "../typesAndEnums";

export function View(props: ModuleViewProps<Interfaces>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const selectedEnsembleIdents = props.viewContext.useSettingsToViewInterfaceValue("selectedEnsembleIdents");
    const selectedParameterIdents = props.viewContext.useSettingsToViewInterfaceValue("selectedParameterIdents");
    const selectedVisualizationType = props.viewContext.useSettingsToViewInterfaceValue("selectedVisualizationType");
    const showIndividualRealizationValues = props.viewContext.useSettingsToViewInterfaceValue(
        "showIndividualRealizationValues"
    );
    const showPercentilesAndMeanLines =
        props.viewContext.useSettingsToViewInterfaceValue("showPercentilesAndMeanLines");

    const ensembleSet = props.workbenchSession.getEnsembleSet();
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const parameterDataArr = makeParameterDataArr(
        ensembleSet,
        selectedEnsembleIdents,
        selectedParameterIdents,
        filterEnsembleRealizationsFunc
    );

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <ParameterDistributionPlot
                dataArr={parameterDataArr}
                plotType={selectedVisualizationType}
                showIndividualRealizationValues={showIndividualRealizationValues}
                showPercentilesAndMeanLines={showPercentilesAndMeanLines}
                width={wrapperDivSize.width}
                height={wrapperDivSize.height}
            ></ParameterDistributionPlot>
        </div>
    );
}

function makeParameterDataArr(
    ensembleSet: EnsembleSet,
    ensembleIdents: EnsembleIdent[],
    parameterIdents: ParameterIdent[],
    filterEnsembleRealizations: EnsembleRealizationFilterFunction
): ParameterDataArr[] {
    const parameterDataArr: ParameterDataArr[] = [];

    for (const parameterIdent of parameterIdents) {
        const parameterDataArrEntry: ParameterDataArr = {
            parameterIdent: parameterIdent,
            ensembleParameterRealizationAndValues: [],
        };

        for (const ensembleIdent of ensembleIdents) {
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (!ensemble) continue;

            const ensembleParameters = ensemble.getParameters();
            if (!ensembleParameters.hasParameter(parameterIdent)) continue;

            const filteredRealizations = new Set(filterEnsembleRealizations(ensembleIdent));
            const parameter = ensembleParameters.getParameter(parameterIdent);
            parameterDataArrEntry.isLogarithmic =
                parameter.type === ParameterType.CONTINUOUS ? parameter.isLogarithmic : false;

            const parameterValues: number[] = [];
            const realizationNumbers: number[] = [];
            parameter.realizations.forEach((realization, index) => {
                if (filteredRealizations.has(realization)) {
                    parameterValues.push(parameter.values[index] as number);
                    realizationNumbers.push(realization);
                }
            });

            const ensembleParameterValues = {
                ensembleDisplayName: ensemble.getDisplayName(),
                ensembleColor: ensemble.getColor(),
                values: parameterValues,
                realizations: realizationNumbers,
            };

            parameterDataArrEntry.ensembleParameterRealizationAndValues.push(ensembleParameterValues);
        }

        if (parameterDataArrEntry.ensembleParameterRealizationAndValues.length > 0) {
            parameterDataArr.push(parameterDataArrEntry);
        }
    }

    return parameterDataArr;
}
