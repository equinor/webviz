import type React from "react";

import type { SummaryVectorObservations_api } from "@api";
import type { ViewContext } from "@framework/ModuleContext";
import { WorkbenchSession, useEnsembleSet } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { ColorSet } from "@lib/utils/ColorSet";
import type { Size2D } from "@lib/utils/geometry";
import { CurveType } from "@modules/RelPerm/typesAndEnums";

import { useAtomValue } from "jotai";

// import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";
import type { Interfaces } from "../../interfaces";
import { loadedRelPermSpecificationsAndRealizationDataAtom } from "../atoms/derivedAtoms";
import { PlotBuilder, SubplotOwner } from "../utils/PlotBuilder";

export function usePlotBuilder(
    viewContext: ViewContext<Interfaces>,
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings,
    wrapperDivSize: Size2D,
): React.ReactNode {
    // const visualizationMode = viewContext.useSettingsToViewInterfaceValue("visualizationMode");
    // const showObservations = viewContext.useSettingsToViewInterfaceValue("showObservations");
    const relPermSpecs = viewContext.useSettingsToViewInterfaceValue("relPermSpecifications");
    const visualizationSettings = viewContext.useSettingsToViewInterfaceValue("visualizationSettings");
    const colorBy = visualizationSettings.colorBy;
    // const showHistorical = viewContext.useSettingsToViewInterfaceValue("showHistorical");
    // const statisticsSelection = viewContext.useSettingsToViewInterfaceValue("statisticsSelection");
    // const subplotLimitation = viewContext.useSettingsToViewInterfaceValue("subplotLimitation");
    const ensembleSet = useEnsembleSet(workbenchSession);
    const loadedRelPermSpecificationsAndRealizationData = useAtomValue(
        loadedRelPermSpecificationsAndRealizationDataAtom,
    );
    const colorSet = workbenchSettings.useColorSet();

    // const colorByParameter = viewContext.useSettingsToViewInterfaceValue("colorByParameter");
    // const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);

    // const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc(viewContext);

    // const subplotOwner = groupBy === GroupBy.TIME_SERIES ? SubplotOwner.VECTOR : SubplotOwner.ENSEMBLE;
    const subplotOwner = SubplotOwner.ENSEMBLE;

    // visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
    // visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS

    const plotBuilder = new PlotBuilder(
        subplotOwner,
        relPermSpecs,
        ensembleSet,

        visualizationSettings,
        colorSet,
        wrapperDivSize.width,
        wrapperDivSize.height,
    );

    // Add traces based on visualization mode
    plotBuilder.addRealizationsTraces(loadedRelPermSpecificationsAndRealizationData);
    // const plot = plotBuilder.build(handlePlotOnClick);
    plotBuilder.setXAxisOptions({
        title: { text: "Sw" },
        range: [0, 1],
    });

    return plotBuilder.build();
}
