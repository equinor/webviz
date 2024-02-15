import React, { useEffect } from "react";

import { ModuleViewProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { useElementSize } from "@lib/hooks/useElementSize";

import { usePvtDataQuery } from "./queryHooks";
import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------

export function View({ viewContext, workbenchSession }: ModuleViewProps<State>) {
    return null;
}
