import { atom } from "jotai";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";

export const userSelectedReferenceEnsembleIdentAtom = atom<RegularEnsembleIdent | null>(null);
export const userSelectedComparisonEnsembleIdentAtom = atom<RegularEnsembleIdent | null>(null);
export const userSelectedReferenceTableNameAtom = atom<string | null>(null);
export const userSelectedComparisonTableNameAtom = atom<string | null>(null);
export const userSelectedResultNameAtom = atom<string | null>(null);
export const userSelectedSubplotByAtom = atom<string | null>(null);
export const userSelectedIndicesWithValuesAtom = atom<InplaceVolumesIndexWithValues_api[]>([]);
export const selectedIndexValueCriteriaAtom = atom<IndexValueCriteria>(IndexValueCriteria.REQUIRE_EQUALITY);
