import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { ParameterDistributionPlot } from "./components/ParameterDistributionPlot";
import { EnsembleParameterValues, ParameterDataArr, State } from "./state";

export function View({ viewContext, workbenchSession, workbenchSettings }: ModuleViewProps<State>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const ensembleSetParameterIdents = viewContext.useStoreValue("ensembleSetParameterIdents");
    const colorSet = workbenchSettings.useColorSet();
    const ensembleColors = new Map<string, string>();

    const parameterDataArr: ParameterDataArr[] = [];
    const ensembleSet = workbenchSession.getEnsembleSet();
    ensembleSet.getEnsembleArr().forEach((ensemble, index) => {
        const color = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
        ensembleColors.set(ensemble.getDisplayName(), color);
    });

    for (const ensembleSetParameter of ensembleSetParameterIdents) {
        const parameter = ensembleSetParameter.parameterIdent;
        const parameterDataArrEntry: ParameterDataArr = {
            parameterIdent: parameter,
            ensembleParameterValues: [],
        };
        for (const ensembleIndent of ensembleSetParameter.ensembleIdents) {
            const ensemble = ensembleSet.findEnsemble(ensembleIndent);
            if (!ensemble) continue;
            const ensembleParameters = ensemble.getParameters();
            if (!ensembleParameters.hasParameter(parameter)) continue;
            const ensembleParameter = ensembleParameters.getParameter(parameter);
            const ensembleParameterValues: EnsembleParameterValues = {
                ensembleDisplayName: ensemble.getDisplayName(),
                values: ensembleParameter.values as number[],
            };
            parameterDataArrEntry.ensembleParameterValues.push(ensembleParameterValues);
        }
        parameterDataArr.push(parameterDataArrEntry);
    }

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

export default ParameterDistributionPlot;
