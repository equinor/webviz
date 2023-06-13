import React from "react";

import { Ensemble } from "./Ensemble";
import { EnsembleSet } from "./EnsembleSet";
import { WorkbenchServices } from "./WorkbenchServices";

export function useEnsembleSet(workbenchServices: WorkbenchServices): EnsembleSet {
    const [storedEnsembleSet, setStoredEnsembleSet] = React.useState<EnsembleSet>(new EnsembleSet([]));

    React.useEffect(
        function subscribeToNavigatorEnsemblesTopic() {
            function handleChangeInNavigatorEnsembles() {
                setStoredEnsembleSet(workbenchServices.getEnsembleSet());
            }

            const unsubFunc = workbenchServices.subscribe("navigator.ensembles", handleChangeInNavigatorEnsembles);
            return unsubFunc;
        },
        [workbenchServices]
    );

    return storedEnsembleSet;
}

export function useFirstEnsembleInEnsembleSet(workbenchServices: WorkbenchServices): Ensemble | null {
    const ensembleSet = useEnsembleSet(workbenchServices);
    if (!ensembleSet.hasData()) {
        return null;
    }

    return ensembleSet.getEnsembleArr()[0];
}
