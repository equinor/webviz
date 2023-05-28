import React from "react";

import { ModuleFCProps } from "@framework/Module";

import { State } from "./state";
import { EnsembleScalarResponse } from "@api";
const ensembleResponse: EnsembleScalarResponse = {
    realizations: [1, 2, 3], values: [1, 2, 3], name: "STOIIP_OIL", unit: "Sm³"
}
export function settings({ moduleContext }: ModuleFCProps<State>) {
    const selectedSensitivity = moduleContext.useStoreValue("selectedSensitivity");
    return (
        <>
            <div className="flex flex-col gap-2">
                INPUT SLOT: A scalar response for each realization
                <pre>{JSON.stringify(ensembleResponse, null, 2)}</pre>

                OUTPUT SLOT: The selected sensitivity
                <pre>{JSON.stringify(selectedSensitivity, null, 2)}</pre>
            </div>
        </>
    );
}
