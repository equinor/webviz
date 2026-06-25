import { atom } from "jotai";

import type { RftTableDefinition_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { fixupRegularEnsembleIdents } from "@framework/utils/ensembleUiHelpers";

import {
    selectedStatisticsAtom,
    showDepthLineAtom,
    showIndividualRealizationsAtom,
    showObservationsAtom,
    showStatisticalFanAtom,
    showStatisticalLinesAtom,
} from "./baseAtoms";
import {
    userSelectedEnsembleIdentsAtom,
    userSelectedResponseNameAtom,
    userSelectedTimestampUtcMsAtom,
    userSelectedWellNameAtom,
} from "./persistableFixableAtoms";
import { rftTableDefinitionQueriesAtom } from "./queryAtoms";

type RftEnsembleTableDefinition = {
    ensembleIdent: RegularEnsembleIdent;
    tableDefinition: RftTableDefinition_api;
};

function fixupSelectedOrFirstValue<T extends string | number>(selectedValue: T | null, values: T[]): T | null {
    if (selectedValue !== null && values.includes(selectedValue)) {
        return selectedValue;
    }

    return values[0] ?? null;
}

function intersectArrays<T>(arrays: T[][]): T[] {
    if (arrays.length === 0) {
        return [];
    }

    return arrays.reduce<T[]>((intersection, currentArray) => {
        return intersection.filter((value) => currentArray.includes(value));
    }, arrays[0]);
}

export const selectedEnsembleIdentsAtom = atom<RegularEnsembleIdent[]>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom).value;

    return fixupRegularEnsembleIdents(userSelectedEnsembleIdents, ensembleSet) ?? [];
});

export const ensembleTableDefinitionsAtom = atom<RftEnsembleTableDefinition[]>((get) => {
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
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

export const selectedResponseNameAtom = atom<string | null>((get) => {
    return fixupSelectedOrFirstValue(get(userSelectedResponseNameAtom).value, get(availableResponseNamesAtom));
});

export const availableWellNamesAtom = atom<string[]>((get) => {
    const tableDefinitions = get(ensembleTableDefinitionsAtom);
    const wellNamesPerDefinition = tableDefinitions.map((definition) =>
        definition.tableDefinition.well_infos.map((wellInfo) => wellInfo.well_name),
    );

    return intersectArrays(wellNamesPerDefinition).sort((left, right) => left.localeCompare(right));
});

export const selectedWellNameAtom = atom<string | null>((get) => {
    return fixupSelectedOrFirstValue(get(userSelectedWellNameAtom).value, get(availableWellNamesAtom));
});

export const availableTimestampsUtcMsAtom = atom<number[]>((get) => {
    const tableDefinitions = get(ensembleTableDefinitionsAtom);
    const selectedWellName = get(selectedWellNameAtom);

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

export const selectedTimestampUtcMsAtom = atom<number | null>((get) => {
    return fixupSelectedOrFirstValue(get(userSelectedTimestampUtcMsAtom).value, get(availableTimestampsUtcMsAtom));
});

export const visualizationSettingsAtom = atom((get) => {
    return {
        showIndividualRealizations: get(showIndividualRealizationsAtom),
        showStatisticalLines: get(showStatisticalLinesAtom),
        showStatisticalFan: get(showStatisticalFanAtom),
        showObservations: get(showObservationsAtom),
        selectedStatistics: get(selectedStatisticsAtom),
    };
});

export const showDepthLineSettingAtom = atom((get) => get(showDepthLineAtom));
