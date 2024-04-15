import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleViewProps } from "@framework/Module";
import { EnsembleRealizationFilterFunction, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorSet } from "@lib/utils/ColorSet";
import { computeQuantile } from "@modules/_shared/statistics";

import { InplaceHistogramPlot } from "./components/inplaceHistogramPlot";

import { Interface } from "../settingsToViewInterface";
import { State } from "../state";

export function View(props: ModuleViewProps<State, Interface>) {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const colorBy = props.viewContext.useSettingsToViewInterfaceValue("colorBy");
    const groupBy = props.viewContext.useSettingsToViewInterfaceValue("groupBy");
    const inplaceDataSetResultQuery = props.viewContext.useSettingsToViewInterfaceValue("inplaceTableDataSetQuery");
    console.log(inplaceDataSetResultQuery);
    const ensembleSet = props.workbenchSession.getEnsembleSet();

    const colorSet = props.workbenchSettings.useColorSet();
    const ensembleColors = getEnsembleColors(ensembleSet, colorSet);
    const resultValues: number[] = inplaceDataSetResultQuery.dataCollections
        .map((ensembleResults) => ensembleResults.tableData?.result_per_realization.map((realData) => realData[1]))
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
