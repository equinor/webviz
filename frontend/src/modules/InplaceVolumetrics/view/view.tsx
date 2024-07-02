import React from "react";

import { InplaceVolumetricResponseNames_api, InplaceVolumetricsIndex_api } from "@api";
import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleViewProps } from "@framework/Module";
import { useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";
import { ColorSet } from "@lib/utils/ColorSet";
import { responseNamesToStandardResponseNames } from "@modules/_shared/InplaceVolumetrics/InplaceVolumetricsTablesInfoAccessor";
import { FluidZoneTypeEnum } from "@modules/_shared/InplaceVolumetrics/types";

import { InplaceDistributionPlot, InplaceResultValues } from "./components/InplaceDistributionPlot";
import { useInplaceDataResultsQuery } from "./hooks/queryHooks";

import { Interface } from "../settingsToViewInterface";
import { State } from "../state";
import { PlotTypeEnum } from "../typesAndEnums";
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
    const selectedInplaceFluidZones = props.viewContext.useSettingsToViewInterfaceValue("selectedInplaceFluidZones");
    const responseNamesToStandard = responseNamesToStandardResponseNames(
        selectedInplaceResponseName ? [selectedInplaceResponseName] : [],
        selectedInplaceFluidZones
    );
    const selectedInplaceIndexesValues = props.viewContext.useSettingsToViewInterfaceValue("selectedInplaceIndexes");

    const inplaceDataSetResultQuery = useInplaceDataResultsQuery(
        ensembleIdentsWithRealizations,
        selectedInplaceTableName,
        responseNamesToStandard[0] as InplaceVolumetricResponseNames_api,
        selectedInplaceIndexesValues as InplaceVolumetricsIndex_api[]
    );
    const plotType = props.viewContext.useSettingsToViewInterfaceValue("plotType");
    const colorBy = props.viewContext.useSettingsToViewInterfaceValue("colorBy");
    const groupBy = props.viewContext.useSettingsToViewInterfaceValue("groupBy");

    const data: InplaceVolGroupedResultValues[] = inplaceDataSetResultQuery.someQueriesFailed
        ? []
        : getGroupedInplaceVolResults(
              inplaceDataSetResultQuery.ensembleSetData,
              selectedInplaceIndexesValues as InplaceVolumetricsIndex_api[],
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
            <InplaceDistributionPlot
                plotType={plotType}
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
