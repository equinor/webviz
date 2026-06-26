import { atom } from "jotai";

import type { RftTableDefinition_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { selectedEnsembleIdentsAtom, selectedWellNameAtom } from "./persistableFixableAtoms";
import { rftTableDefinitionQueriesAtom } from "./queryAtoms";

type RftEnsembleTableDefinition = {
    ensembleIdent: RegularEnsembleIdent;
    tableDefinition: RftTableDefinition_api;
};

function intersectArrays<T>(arrays: T[][]): T[] {
    if (arrays.length === 0) {
        return [];
    }

    return arrays.reduce<T[]>((intersection, currentArray) => {
        return intersection.filter((value) => currentArray.includes(value));
    }, arrays[0]);
}

export const ensembleTableDefinitionsAtom = atom<RftEnsembleTableDefinition[]>((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom).value;
    const tableDefinitionQueries = get(rftTableDefinitionQueriesAtom);

    return tableDefinitionQueries.flatMap((queryResult, index) => {
        if (!queryResult.data) {
            return [];
        }

        return [{ ensembleIdent: selectedEnsembleIdents[index], tableDefinition: queryResult.data }];
    });
});

export const availableResponseNamesAtom = atom<string[]>((get) => {
    const tableDefinitions = get(ensembleTableDefinitionsAtom);
    const responseNamesPerDefinition = tableDefinitions.map((definition) => definition.tableDefinition.response_names);

    return intersectArrays(responseNamesPerDefinition);
});

export const availableWellNamesAtom = atom<string[]>((get) => {
    const tableDefinitions = get(ensembleTableDefinitionsAtom);
    const wellNamesPerDefinition = tableDefinitions.map((definition) =>
        definition.tableDefinition.well_infos.map((wellInfo) => wellInfo.well_name),
    );

    return intersectArrays(wellNamesPerDefinition).sort((left, right) => left.localeCompare(right));
});

export const availableTimestampsUtcMsAtom = atom<number[]>((get) => {
    const tableDefinitions = get(ensembleTableDefinitionsAtom);
    const selectedWellName = get(selectedWellNameAtom).value;

    if (!selectedWellName) {
        return [];
    }

    const timestampsPerDefinition = tableDefinitions.map((definition) => {
        const wellInfo = definition.tableDefinition.well_infos.find(
            (candidate) => candidate.well_name === selectedWellName,
        );
        return wellInfo?.timestamps_utc_ms ?? [];
    });

    return intersectArrays(timestampsPerDefinition).sort((left, right) => left - right);
});
