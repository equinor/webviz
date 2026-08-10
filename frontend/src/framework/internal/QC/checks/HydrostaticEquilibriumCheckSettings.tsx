import type React from "react";

import { useQuery } from "@tanstack/react-query";

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

// Grid model picker shared by both hydrostatic-equilibrium checks - ported from `ModelQc`'s
// `Settings()` grid-model field (settings.tsx), minus the jotai atom plumbing.
export function HydrostaticEquilibriumCheckSettings(
    props: HydrostaticEquilibriumCheckSettingsProps,
): React.ReactNode {
    const { ensemble, params, onParamsChange } = props;

    const referenceRealization = resolveReferenceRealization(ensemble, []);
    const gridModelsInfoQuery = useQuery(getGridModelsInfoQueryOptions(ensemble, referenceRealization));

    const availableGridNames = gridModelsInfoQuery.data?.map((gridModelInfo) => gridModelInfo.grid_name) ?? [];

    return (
        <Setting.Panel>
            <Setting.Field
                label="Grid model"
                help={{
                    title: "Grid model",
                    content:
                        "The 3D grid model whose dynamic properties are checked, and whose first two time " +
                        "steps define t0 and t1 for the equilibrium check. Leave unset to use the first " +
                        "available grid model.",
                }}
                loadingOverlay={gridModelsInfoQuery.isFetching}
            >
                <Combobox
                    items={availableGridNames.map((gridName) => ({ label: gridName, value: gridName }))}
                    value={params.gridName ?? undefined}
                    onValueChange={(value) => onParamsChange({ ...params, gridName: value })}
                    placeholder="Select grid model..."
                />
            </Setting.Field>
        </Setting.Panel>
    );
}
