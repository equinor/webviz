import React from "react";

import { vectorDefinitions } from "@assets/vectorDefinitions";

import type { ViewContext } from "@framework/ModuleContext";

import type { Interfaces } from "../../interfaces";
import { isInPlaceVector } from "../../utils/regionalVectors";

/**
 * Sets the module instance title based on the selected vector, recovery factor mode,
 * and subplot dimension.
 */
export function useInstanceTitle(viewContext: ViewContext<Interfaces>): void {
    const selectedVectorBaseName = viewContext.useSettingsToViewInterfaceValue("selectedVectorBaseName");
    const showRecoveryFactor = viewContext.useSettingsToViewInterfaceValue("showRecoveryFactor");
    const subplotBy = viewContext.useSettingsToViewInterfaceValue("subplotBy");

    const vectorDescription = selectedVectorBaseName ? vectorDefinitions[selectedVectorBaseName]?.description : null;
    const vectorDisplayName = vectorDescription
        ? `${vectorDescription} (${selectedVectorBaseName})`
        : (selectedVectorBaseName ?? "Value");
    const applyRecovery = showRecoveryFactor && isInPlaceVector(selectedVectorBaseName);
    const vectorTitle = applyRecovery ? `Recovery Factor of ${vectorDisplayName}` : vectorDisplayName;
    const title = subplotBy ? `${vectorTitle} per ${subplotBy}` : vectorTitle;

    React.useEffect(() => {
        viewContext.setInstanceTitle(title);
    }, [viewContext, title]);
}
