import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleViewProps } from "@framework/Module";
import { EnsembleRealizationFilterFunction, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";

import { ParameterDistributionPlot } from "./components/ParameterDistributionPlot";

import { Interface } from "../settingstoViewInterface";
import { State } from "../state";
import { EnsembleParameterValues, ParameterDataArr } from "../typesAndEnums";

export function View(props: ModuleViewProps<State, Interface>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const selectedEnsembleIdents = props.viewContext.useSettingsToViewInterfaceValue("selectedEnsembleIdents");
    const selectedParameterIdents = props.viewContext.useSettingsToViewInterfaceValue("selectedParameterIdents");
    const ensembleSet = props.workbenchSession.getEnsembleSet();
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const parameterDataArr = makeParameterDataArr(
        ensembleSet,
        selectedEnsembleIdents,
        selectedParameterIdents,
        filterEnsembleRealizationsFunc
    );

    const colorSet = props.workbenchSettings.useColorSet();
    const ensembleColors = new Map<string, string>();
    ensembleSet.getEnsembleArr().forEach((ensemble, index) => {
        const color = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
        ensembleColors.set(ensemble.getDisplayName(), color);
    });

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <ParameterDistributionPlot
                dataArr={parameterDataArr}
                ensembleColors={ensembleColors}
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
            ensembleParameterValues: [],
        };

        for (const ensembleIdent of ensembleIdents) {
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (!ensemble) continue;

            const ensembleParameters = ensemble.getParameters();
            if (!ensembleParameters.hasParameter(parameterIdent)) continue;

            const parameter = ensembleParameters.getParameter(parameterIdent);

            const filteredRealizations = new Set(filterEnsembleRealizations(ensembleIdent));

            const parameterValues = parameter.realizations
                .map((realization, index) => {
                    if (filteredRealizations.has(realization)) {
                        return parameter.values[index] as number;
                    }
                    return null;
                })
                .filter((value) => value !== null);

            const ensembleParameterValues = {
                ensembleDisplayName: ensemble.getDisplayName(),
                values: parameterValues as number[],
            };

            parameterDataArrEntry.ensembleParameterValues.push(ensembleParameterValues);
        }

        if (parameterDataArrEntry.ensembleParameterValues.length > 0) {
            parameterDataArr.push(parameterDataArrEntry);
        }
    }

    return parameterDataArr;
}
