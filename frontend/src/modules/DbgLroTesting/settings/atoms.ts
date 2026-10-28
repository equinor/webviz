import { atom } from "jotai";
import { ViewDisplayableData, ViewInputData } from "../types";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { persistableFixableAtom } from "@framework/utils/atomUtils";
import { areEnsembleIdentsEqual } from "@framework/utils/ensembleIdentUtils";
import { fixupRegularEnsembleIdent } from "@framework/utils/ensembleUiHelpers";
import { getVectorListOptions } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";
import { atomWithQuery } from "jotai-tanstack-query";

export const viewDisplayableDataAtom = atom<ViewDisplayableData | null>(null);
export const viewInputDataAtom = atom<ViewInputData | null>(null);


export const selectedEnsembleIdentAtom = persistableFixableAtom<RegularEnsembleIdent | null>({
    initialValue: null,
    areEqualFunction: areEnsembleIdentsEqual,
    isValidFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);
        return value !== null && ensembleSet.hasEnsemble(value);
    },
    fixupFunction: ({ get, value }) => {
        const ensembleSet = get(EnsembleSetAtom);

        return fixupRegularEnsembleIdent(value ?? null, ensembleSet);
    },
});

const rawAvailableVectorsQueryAtom = atomWithQuery((get) => {
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom).value;

    const query = {
        ...getVectorListOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                ...makeCacheBustingQueryParam(selectedEnsembleIdent),
            },
        }),
        enabled: !!(selectedEnsembleIdent?.getCaseUuid() && selectedEnsembleIdent?.getEnsembleName()),
    };

    return query;
});

export const availableVectorsAtom = atom<string[]>((get) => {
    const rawVectors = get(rawAvailableVectorsQueryAtom);

    let vecArr: string[] = [];
    if (rawVectors.data) {
        vecArr = rawVectors.data.map((item) => item.name);
    }

    vecArr.sort();

    return vecArr;
});
