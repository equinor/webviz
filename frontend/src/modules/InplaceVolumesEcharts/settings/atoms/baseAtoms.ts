import { atom } from "jotai";

import { HistogramType } from "@modules/_shared/histogram";
import { IndexValueCriteria } from "@modules/_shared/InplaceVolumes/TableDefinitionsAccessor";
import { PlotType, type InplaceVolumesPlotOptions, BarSortBy } from "@modules/InplaceVolumesEcharts/typesAndEnums";

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
    showStatisticalLabels: true,
});
export const showTableAtom = atom<boolean>(false);
