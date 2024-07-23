import { WellboreTrajectory_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalModuleComponentsInterface } from "@framework/UniDirectionalModuleComponentsInterface";
import { SettingsToViewInterface } from "@modules/3DViewer/interfaces";
import { UseQueryResult } from "@tanstack/react-query";

import { atomWithQuery } from "jotai-tanstack-query";

type ViewAtoms = {
    fieldWellboreTrajectoriesQueryAtom: UseQueryResult<WellboreTrajectory_api[], Error>;
};

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function viewAtomsInitialization(
    settingsToViewInterface: UniDirectionalModuleComponentsInterface<SettingsToViewInterface>
): ModuleAtoms<ViewAtoms> {
    const fieldWellboreTrajectoriesQueryAtom = atomWithQuery((get) => {
        const ensembleIdent = get(settingsToViewInterface.getAtom("ensembleIdent"));
        const ensembleSet = get(EnsembleSetAtom);

        let fieldIdentifier: string | null = null;
        if (ensembleIdent) {
            const ensemble = ensembleSet.findEnsemble(ensembleIdent);
            if (ensemble) {
                fieldIdentifier = ensemble.getFieldIdentifier();
            }
        }

        return {
            queryKey: ["getFieldWellboreTrajectories", fieldIdentifier ?? ""],
            queryFn: () => apiService.well.getFieldWellTrajectories(fieldIdentifier ?? ""),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: Boolean(fieldIdentifier),
        };
    });

    return {
        fieldWellboreTrajectoriesQueryAtom,
    };
}
