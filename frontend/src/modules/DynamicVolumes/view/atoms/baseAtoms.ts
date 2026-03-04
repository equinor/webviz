import { atom } from "jotai";

import type { Frequency_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import type { PlotDimension } from "../../typesAndEnums";

// ──────── View-side atoms (synced from settings via interfaceEffects) ────────
// Only atoms that are consumed by Jotai derived atoms (queryAtoms, derivedAtoms)
// live here.  Values only needed by React components/hooks are read directly
// from the settings→view interface via useSettingsToViewInterfaceValue.

export const colorByAtom = atom<PlotDimension | null>(null);
export const subplotByAtom = atom<PlotDimension | null>(null);
export const resampleFrequencyAtom = atom<Frequency_api | null>(null);
export const ensembleIdentsAtom = atom<RegularEnsembleIdent[]>([]);
export const vectorNamesToFetchAtom = atom<string[]>([]);
export const selectedRegionsAtom = atom<number[]>([]);
export const fipRegionLabelsAtom = atom<Record<number, { zone: string; region: string }>>({});

// ──────── Persisted view atom ──────────

export const activeTimestampUtcMsAtom = atom<number | null>(null);
