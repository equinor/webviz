import { InplaceVolumetricsCategoricalMetaData_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { atom } from "jotai";

export const ensembleIdentAtom = atom<EnsembleIdent | null>(null);
export const tableNameAtom = atom<string | null>(null);
export const responseNameAtom = atom<string | null>(null);
export const categoricalOptionsAtom = atom<InplaceVolumetricsCategoricalMetaData_api[] | null>(null);
export const categoricalFilterAtom = atom<InplaceVolumetricsCategoricalMetaData_api[] | null>(null);
export const realizationsToIncludeAtom = atom<number[] | null>(null);
