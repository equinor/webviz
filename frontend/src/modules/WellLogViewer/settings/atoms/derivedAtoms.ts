import { WellboreLogCurveHeader_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";
import _, { Dictionary } from "lodash";
import { WellboreHeader } from "src/api/models/WellboreHeader";

import {
    userSelectedFieldIdentifierAtom,
    userSelectedWellLogNameAtom,
    userSelectedWellboreUuidAtom,
} from "./baseAtoms";
import { drilledWellboreHeadersQueryAtom, wellLogCurveHeadersQueryAtom } from "./queryAtoms";

export const selectedFieldIdentifierAtom = atom((get) => {
    const ensembleSetArr = get(EnsembleSetAtom).getEnsembleArr();
    const selectedFieldIdentifier = get(userSelectedFieldIdentifierAtom);

    if (ensembleSetArr.length < 1) {
        return null;
    } else if (ensembleSetArr.some((e) => e.getFieldIdentifier() === selectedFieldIdentifier)) {
        return selectedFieldIdentifier;
    } else {
        return ensembleSetArr[0].getFieldIdentifier();
    }
});

export const selectedWellboreAtom = atom<WellboreHeader | null>((get) => {
    const availableWellboreHeaders = get(drilledWellboreHeadersQueryAtom)?.data;
    const selectedWellboreId = get(userSelectedWellboreUuidAtom);

    return getSelectedWellboreHeader(selectedWellboreId, availableWellboreHeaders);
});

export const groupedCurveHeadersAtom = atom<Dictionary<WellboreLogCurveHeader_api[]>>((get) => {
    const logCurveHeaders = get(wellLogCurveHeadersQueryAtom)?.data ?? [];

    return _.groupBy(logCurveHeaders, "logName");
});

export const selectedLogNameAtom = atom<string | null>((get) => {
    const logCurveHeaders = Object.keys(get(groupedCurveHeadersAtom));
    const selectedLogName = get(userSelectedWellLogNameAtom) ?? "";

    if (!logCurveHeaders || logCurveHeaders.length < 1) return null;
    else return logCurveHeaders.includes(selectedLogName) ? selectedLogName : logCurveHeaders[0];
});

export const availableLogCurvesAtom = atom<WellboreLogCurveHeader_api[]>((get) => {
    const selectedLogName = get(selectedLogNameAtom);
    const curveGroups = get(groupedCurveHeadersAtom);

    if (!selectedLogName) return [];
    else return curveGroups[selectedLogName] ?? [];
});

function getSelectedWellboreHeader(
    currentId: string | null,
    wellboreHeaderSet: WellboreHeader[] | null | undefined
): WellboreHeader | null {
    if (!wellboreHeaderSet || wellboreHeaderSet.length < 1) {
        return null;
    }

    if (!currentId) {
        return wellboreHeaderSet[0];
    }

    return wellboreHeaderSet.find((wh) => wh.wellboreUuid === currentId) ?? wellboreHeaderSet[0];
}
