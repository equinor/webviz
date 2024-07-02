import { FluidZone_api, InplaceVolumetricsIndex_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { FluidZoneTypeEnum } from "@modules/_shared/InplaceVolumetrics/types";

import { atom } from "jotai";

import { PlotGroupingEnum, PlotTypeEnum } from "../../typesAndEnums";

function areEnsembleIdentListsEqual(a: EnsembleIdent[], b: EnsembleIdent[]) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (!a[i].equals(b[i])) {
            return false;
        }
    }
    return true;
}

export const userSelectedEnsembleIdentsAtom = atomWithCompare<EnsembleIdent[]>([], areEnsembleIdentListsEqual);
export const plotTypeAtom = atom<PlotTypeEnum>(PlotTypeEnum.HISTOGRAM);
export const groupByAtom = atomWithCompare<PlotGroupingEnum>(PlotGroupingEnum.ENSEMBLE, (a, b) => a === b);
export const colorByAtom = atomWithCompare<PlotGroupingEnum>(PlotGroupingEnum.ENSEMBLE, (a, b) => a === b);
export const userSelectedInplaceTableNameAtom = atom<string | null>(null);
export const userSelectedInplaceFluidZonesAtom = atom<FluidZone_api[]>([]);
export const userSelectedInplaceResponseAtom = atom<string | null>(null);
export const userSelectedInplaceIndexesAtom = atom<InplaceVolumetricsIndex_api[]>([]);
