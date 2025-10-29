import { atom } from "jotai";

import type { InplaceVolumesIndexWithValues_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { TableOriginKey } from "@modules/_shared/InplaceVolumes/types";
import { PlotType } from "@modules/InplaceVolumesPlot/typesAndEnums";
import { BarSortBy } from "@modules/InplaceVolumesPlot/view/utils/plotly/bar";

import { HistogramType, type InplaceVolumesPlotOptions } from "../components/inplaceVolumesPlotOptionsDialog";

export const userSelectedEnsembleIdentsAtom = atom<RegularEnsembleIdent[] | null>(null);
export const userSelectedTableNamesAtom = atom<string[] | null>(null);
export const userSelectedIndicesWithValuesAtom = atom<InplaceVolumesIndexWithValues_api[] | null>(null);
export const userSelectedFirstResultNameAtom = atom<string | null>(null);
export const userSelectedSecondResultNameAtom = atom<string | null>(null);
export const userSelectedSelectorColumnAtom = atom<string | null>(null);
export const userSelectedSubplotByAtom = atom<string>(TableOriginKey.ENSEMBLE);
export const userSelectedPlotTypeAtom = atom<PlotType>(PlotType.HISTOGRAM);
export const userSelectedColorByAtom = atom<string>(TableOriginKey.TABLE_NAME);

export const selectedIndexValueCriteriaAtom = atom<IndexValueCriteria>(IndexValueCriteria.REQUIRE_EQUALITY);
export const plotOptionsAtom = atom<InplaceVolumesPlotOptions>({
    histogramType: HistogramType.Overlay,
    histogramBins: 10,
    barSortBy: BarSortBy.Yvalues,
    showStatisticalMarkers: true,
    showRealizationPoints: false,
    sharedXAxis: false,
    sharedYAxis: false,
    hideConstants: false,
});
