import React from "react";

import { useQuery } from "@tanstack/react-query";

import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { Combobox } from "@lib/components/Combobox";
import { Setting } from "@lib/components/Setting";

import {
    getGridModelsInfoQueryOptions,
    resolveReferenceRealization,
    type HydrostaticEquilibriumCheckParams,
} from "./hydrostaticEquilibriumShared";
import { Grid3dInfo_api } from "@api";

export type HydrostaticEquilibriumCheckSettingsProps = {
    ensemble: RegularEnsemble;
    params: HydrostaticEquilibriumCheckParams;
    onParamsChange: (newParams: HydrostaticEquilibriumCheckParams) => void;
};

// Grid model picker shared by both hydrostatic-equilibrium checks - ported from `ModelQc`'s
// `Settings()` grid-model field (settings.tsx), minus the jotai atom plumbing, and extended to
// multi-select (each selected grid becomes its own matrix coordinate - see
// `hydrostaticGridMatrixCoordinates`).
export function HydrostaticEquilibriumCheckSettings(props: HydrostaticEquilibriumCheckSettingsProps): React.ReactNode {
    const { ensemble, params, onParamsChange } = props;

    const referenceRealization = resolveReferenceRealization(ensemble, []);
    const gridModelsInfoQuery = useQuery(getGridModelsInfoQueryOptions(ensemble, referenceRealization));

    const availableGridNames =
        gridModelsInfoQuery.data
            ?.filter((info) => gridContainsPropertyWithTimeSteps(info))
            .map((gridModelInfo) => gridModelInfo.grid_name) ?? [];

    // Seeds every available grid the first time the grid list loads, so a check run without the
    // user ever opening settings still checks something (mirrors the old single-select picker's
    // "default to the first available grid" behavior, extended to "default to all"). Only ever
    // seeds once - after that, an empty selection means the user deliberately cleared it.
    const hasSeededDefaultRef = React.useRef(false);
    React.useEffect(() => {
        if (hasSeededDefaultRef.current || availableGridNames.length === 0) {
            return;
        }
        hasSeededDefaultRef.current = true;
        if (params.gridNames.length === 0) {
            onParamsChange({ ...params, gridNames: availableGridNames });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableGridNames]);

    return (
        <Setting.Panel>
            <Setting.Field
                label="Grid models"
                help={{
                    title: "Grid models",
                    content:
                        "The 3D grid models whose dynamic properties are checked, each as its own " +
                        "independent realization matrix - a grid's first two time steps define t0 and t1 " +
                        "for that grid's equilibrium check.",
                }}
                loadingOverlay={gridModelsInfoQuery.isFetching}
            >
                <Combobox
                    items={availableGridNames.map((gridName) => ({ label: gridName, value: gridName }))}
                    value={params.gridNames}
                    onValueChange={(value) => onParamsChange({ ...params, gridNames: value })}
                    placeholder="Select grid models..."
                    multiple
                />
            </Setting.Field>
        </Setting.Panel>
    );
}

// We are looking for grids that have the same property at different time steps, which is required for hydrostatic equilibrium checks. If a grid has the same property at different time steps, it means that we can compare the property values at those time steps to check for hydrostatic equilibrium.
// We are only looking for time steps, not intervals.
function gridContainsPropertyWithTimeSteps(gridModelInfo: Grid3dInfo_api): boolean {
    const propertyTimeStepMap = new Map<string, string>();
    for (const propertyInfo of gridModelInfo.property_info_arr) {
        const propertyName = propertyInfo.property_name;
        const timeStep = propertyInfo.iso_date_or_interval;
        if (propertyTimeStepMap.has(propertyName) && timeStep && isSingleTimeStep(timeStep)) {
            const existingTimeStep = propertyTimeStepMap.get(propertyName);
            if (existingTimeStep !== timeStep) {
                return true;
            }
        } else if (timeStep && isSingleTimeStep(timeStep)) {
            propertyTimeStepMap.set(propertyName, timeStep);
        }
    }
    return false;
}

function isSingleTimeStep(timeStep: string): boolean {
    // Check if the time step is a single time step (not an interval)
    return !timeStep.includes("/");
}
