import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import { fixupEnsembleIdent } from "@framework/utils/ensembleUiHelpers";

import { atom } from "jotai";

import {
    userSelectedEnsembleIdentAtom,
    userSelectedResponseNameAtom,
    userSelectedRftTimestampsUtcMsAtom,
} from "./baseAtoms";
import { rftTableDefinitionAtom } from "./queryAtoms";

function fixupSelectedOrFirstValue<T extends string | number>(selectedValue: T | null, values: T[]): T | null {
    const includes = (value: T | null): value is T => {
        return value !== null && values.includes(value);
    };

    if (includes(selectedValue)) {
        return selectedValue;
    }
    if (values.length) {
        return values[0];
    }
    return null;
}

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    const validEnsembleIdent = fixupEnsembleIdent(userSelectedEnsembleIdent, ensembleSet);
    return validEnsembleIdent;
});

export const availableRftResponseNamesAtom = atom<string[]>((get) => {
    const rftTableDefinition = get(rftTableDefinitionAtom);
    return rftTableDefinition.data?.response_names.map((item) => item) ?? [];
});

export const selectedRftResponseNameAtom = atom<string | null>((get) => {
    const availableRftResponseNames = get(availableRftResponseNamesAtom);
    const userSelectedResponseName = get(userSelectedResponseNameAtom);
    return fixupSelectedOrFirstValue(userSelectedResponseName, availableRftResponseNames);
});

export const availableRftWellNamesAtom = atom<string[]>((get) => {
    const rftTableDefinition = get(rftTableDefinitionAtom);
    return rftTableDefinition.data?.well_infos.map((item) => item.well_name) ?? [];
});

export const selectedRftWellNameAtom = atom<string | null>((get) => {
    const availableRftWellNames = get(availableRftWellNamesAtom);
    const userSelectedWellName = get(userSelectedResponseNameAtom);
    return fixupSelectedOrFirstValue(userSelectedWellName, availableRftWellNames);
});

export const availableRftTimestampsUtcMsAtom = atom<number[]>((get) => {
    const rftTableDefinition = get(rftTableDefinitionAtom);
    const selectedWellName = get(selectedRftWellNameAtom);
    const wellInfo = rftTableDefinition.data?.well_infos.find((item) => item.well_name === selectedWellName);
    return wellInfo?.timestamps_utc_ms ?? [];
});

export const selectedRftTimestampsUtcMsAtom = atom<number | null>((get) => {
    const availableRftTimestampsUtcMs = get(availableRftTimestampsUtcMsAtom);
    const userSelectedRftTimestampsUtcMs = get(userSelectedRftTimestampsUtcMsAtom);
    return fixupSelectedOrFirstValue(userSelectedRftTimestampsUtcMs, availableRftTimestampsUtcMs);
});
