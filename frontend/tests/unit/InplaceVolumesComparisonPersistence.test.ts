import { QueryClient } from "@tanstack/query-core";
import { Ajv } from "ajv/dist/jtd";
import { createStore, type Setter, type WritableAtom } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";
import { describe, expect, test } from "vitest";

import { getInplaceTableDefinitionsOptions } from "@api";
import { EnsembleFingerprintStore } from "@framework/EnsembleFingerprintStore";
import { SensitivityType } from "@framework/EnsembleSensitivities";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { isPersistableAtom, Source } from "@framework/utils/atomUtils";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { waterfallSourcesAtom } from "@modules/InplaceVolumesComparison/settings/atoms/derivedAtoms";
import { selectedReferenceSensitivityCaseAtom } from "@modules/InplaceVolumesComparison/settings/atoms/persistableFixableAtoms";
import {
    deserializeSettings,
    SERIALIZED_SETTINGS_SCHEMA,
    type SerializedSettings,
} from "@modules/InplaceVolumesComparison/settings/persistence";

const ENSEMBLE = new RegularEnsemble(
    "DROGON",
    ["DROGON"],
    "11111111-aaaa-4444-aaaa-aaaaaaaaaaaa",
    "case1",
    "iter-0",
    "sc",
    [0, 1, 2],
    [],
    [
        {
            name: "faults",
            type: SensitivityType.SCENARIO,
            cases: [
                { name: "low", realizations: [0, 1] },
                { name: "high", realizations: [2] },
            ],
        },
    ],
    null,
    "",
);

function makeStoreWithTableDefinitions() {
    const store = createStore();
    store.set(EnsembleSetAtom, new EnsembleSet([ENSEMBLE]));
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    const ensembleIdent = ENSEMBLE.getIdent();
    EnsembleFingerprintStore.update(new Map([[ensembleIdent.toString(), "fingerprint"]]));
    const { queryKey } = getInplaceTableDefinitionsOptions({
        query: {
            case_uuid: ensembleIdent.getCaseUuid(),
            ensemble_name: ensembleIdent.getEnsembleName(),
            ...makeCacheBustingQueryParam(ensembleIdent),
        },
    });
    queryClient.setQueryData(queryKey, [{ tableName: "geogrid", resultNames: ["STOIIP"], indicesWithValues: [] }]);
    store.set(queryClientAtom, queryClient);
    return store;
}

// Mirrors ModuleInstanceSerializer, which marks restored persistable values as persisted.
function makePersistedSetter(store: ReturnType<typeof createStore>): Setter {
    return ((atom: WritableAtom<unknown, [unknown], unknown>, value: unknown) =>
        store.set(atom, isPersistableAtom(atom) ? { value, _source: Source.PERSISTENCE } : value)) as Setter;
}

const OLD_SETTINGS: SerializedSettings = {
    referenceEnsembleIdentString: null,
    comparisonEnsembleIdentString: null,
    referenceTableName: "geogrid",
    comparisonTableName: "geogrid",
    resultName: "STOIIP",
    subplotBy: null,
    indicesWithValues: [],
    indexValueCriteria: IndexValueCriteria.REQUIRE_EQUALITY,
    showTable: true,
};

describe("InplaceVolumesComparison settings persistence", () => {
    const validate = new Ajv().compile(SERIALIZED_SETTINGS_SCHEMA);

    test("schema accepts old settings without sensitivity cases", () => {
        expect(validate(OLD_SETTINGS)).toBe(true);
    });

    test("schema accepts null and object sensitivity cases", () => {
        expect(
            validate({
                ...OLD_SETTINGS,
                referenceSensitivityCase: { sensitivityName: "rms_seed", caseName: "p10_p90" },
                comparisonSensitivityCase: null,
            }),
        ).toBe(true);
        expect(validate({ ...OLD_SETTINGS, referenceSensitivityCase: { sensitivityName: "rms_seed" } })).toBe(false);
    });

    test("a restored sensitivity case that does not exist blocks the sources", () => {
        const store = makeStoreWithTableDefinitions();
        const ensembleIdentString = ENSEMBLE.getIdent().toString();
        deserializeSettings(
            {
                ...OLD_SETTINGS,
                referenceEnsembleIdentString: ensembleIdentString,
                comparisonEnsembleIdentString: ensembleIdentString,
                referenceSensitivityCase: { sensitivityName: "faults", caseName: "removed" },
                comparisonSensitivityCase: { sensitivityName: "faults", caseName: "high" },
            },
            makePersistedSetter(store),
        );

        expect(store.get(selectedReferenceSensitivityCaseAtom).isValidInContext).toBe(false);
        expect(store.get(waterfallSourcesAtom)).toBeNull();

        store.set(selectedReferenceSensitivityCaseAtom, { sensitivityName: "faults", caseName: "low" });
        expect(store.get(waterfallSourcesAtom)?.reference.sensitivityCase).toEqual({
            sensitivityName: "faults",
            caseName: "low",
        });
    });
});
