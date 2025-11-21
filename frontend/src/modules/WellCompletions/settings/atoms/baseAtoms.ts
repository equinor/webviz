import { SortDirection, SortWellsBy } from "@webviz/well-completions-plot";
import { atom } from "jotai";

import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";
import { RealizationMode, TimeAggregationMode } from "@modules/WellCompletions/typesAndEnums";

export const syncedEnsembleIdentsAtom = atom<RegularEnsembleIdent[] | null>(null);
export const selectedStratigraphyColorSetAtom = atom<ColorSet | null>(null);

export const realizationModeAtom = atom<RealizationMode>(RealizationMode.AGGREGATED);
export const timeAggregationModeAtom = atom<TimeAggregationMode>(TimeAggregationMode.NONE);
export const isZeroCompletionsHiddenAtom = atom<boolean>(false);
export const wellExclusionTextAtom = atom<string>("");
export const wellSearchTextAtom = atom<string>("");
export const sortWellsByAtom = atom<SortWellsBy>(SortWellsBy.WELL_NAME);
export const wellSortDirectionAtom = atom<SortDirection>(SortDirection.ASCENDING);
