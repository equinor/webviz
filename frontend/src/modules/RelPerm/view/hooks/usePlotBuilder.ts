import type React from "react";

import type { ViewContext } from "@framework/ModuleContext";
import { WorkbenchSession, useEnsembleSet } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { Size2D } from "@lib/utils/geometry";

import { useAtomValue } from "jotai";

import type { Interfaces } from "../../interfaces";
import { loadedRelPermSpecificationsAndRealizationDataAtom } from "../atoms/derivedAtoms";
import { PlotBuilder } from "../utils/PlotBuilder";

export function usePlotBuilder(
    viewContext: ViewContext<Interfaces>,
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings,
    wrapperDivSize: Size2D,
): React.ReactNode {
    const relPermSpecs = viewContext.useSettingsToViewInterfaceValue("relPermSpecifications");
    const visualizationSettings = viewContext.useSettingsToViewInterfaceValue("visualizationSettings");

    const ensembleSet = useEnsembleSet(workbenchSession);
    const loadedRelPermSpecificationsAndRealizationData = useAtomValue(
        loadedRelPermSpecificationsAndRealizationDataAtom,
    );
    const colorSet = workbenchSettings.useColorSet();

    const plotBuilder = new PlotBuilder(
        relPermSpecs,
        ensembleSet,
        visualizationSettings,
        colorSet,
        wrapperDivSize.width,
        wrapperDivSize.height,
    );

    plotBuilder.addRealizationsTraces(loadedRelPermSpecificationsAndRealizationData);

    plotBuilder.setXAxisOptions({
        title: { text: "Sw", standoff: 0 },
        range: [0, 1],
    });

    return plotBuilder.build();
}
