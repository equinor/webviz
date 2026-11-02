import React from "react";

import { useQuery } from "@tanstack/react-query";

import type { Grid3dInfo_api } from "@api";
import type { RegularEnsemble } from "@framework/RegularEnsemble";
import { Combobox } from "@lib/components/Combobox";
import { Setting } from "@lib/components/Setting";

import {
    getGridModelsInfoQueryOptions,
    resolveReferenceRealization,
    type HydrostaticEquilibriumCheckParams,
} from "./hydrostaticEquilibriumShared";

export type HydrostaticEquilibriumCheckSettingsProps = {
    ensemble: RegularEnsemble;
    params: HydrostaticEquilibriumCheckParams;
    onParamsChange: (newParams: HydrostaticEquilibriumCheckParams) => void;
};

// Each selected grid becomes its own matrix coordinate - see `hydrostaticGridMatrixCoordinates`
export function HydrostaticEquilibriumCheckSettings(props: HydrostaticEquilibriumCheckSettingsProps): React.ReactNode {
    const { ensemble, params, onParamsChange } = props;

    const referenceRealization = resolveReferenceRealization(ensemble, []);
    const gridModelsInfoQuery = useQuery(getGridModelsInfoQueryOptions(ensemble, referenceRealization));

    const availableGridNames =
        gridModelsInfoQuery.data
            ?.filter((info) => gridContainsPropertyWithTimeSteps(info))
            .map((gridModelInfo) => gridModelInfo.grid_name) ?? [];

    // Seeds every available grid once, so a run without opening the settings still checks something.
    // Afterwards an empty selection means the user cleared it deliberately.
    const hasSeededDefaultRef = React.useRef(false);
    React.useEffect(() => {
        if (hasSeededDefaultRef.current || availableGridNames.length === 0) {
            return;
        }
        hasSeededDefaultRef.current = true;
        if (params.gridNames.length === 0) {
            onParamsChange({ ...params, gridNames: availableGridNames });
        }
        // eslint-disable-next-line @eslint-react/exhaustive-deps
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

// The check compares a property between two time steps, so a grid needs a property with at least two of them
// (intervals, which contain a '/', don't count)
function gridContainsPropertyWithTimeSteps(gridModelInfo: Grid3dInfo_api): boolean {
    const timeStepsByProperty = new Map<string, Set<string>>();
    for (const propertyInfo of gridModelInfo.property_info_arr) {
        const timeStep = propertyInfo.iso_date_or_interval;
        if (!timeStep || timeStep.includes("/")) {
            continue;
        }
        const timeSteps = timeStepsByProperty.get(propertyInfo.property_name) ?? new Set<string>();
        timeSteps.add(timeStep);
        timeStepsByProperty.set(propertyInfo.property_name, timeSteps);
    }
    return Array.from(timeStepsByProperty.values()).some((timeSteps) => timeSteps.size >= 2);
}
