import { atom } from "jotai";

import { HistogramType } from "@modules/_shared/histogram";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { PlotType, type InplaceVolumesPlotOptions } from "@modules/InplaceVolumesNew/typesAndEnums";
import { BarSortBy } from "@modules/InplaceVolumesNew/view/utils/plotly/bar";

export const selectedPlotTypeAtom = atom<PlotType>(PlotType.HISTOGRAM);

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
    showPercentageInHistogram: true,
});
export const showTableAtom = atom<boolean>(false);
