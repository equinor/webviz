import type { JTDSchemaType } from "ajv/dist/core";

import { HistogramType } from "@modules/_shared/histogram";
import type { InplaceVolumesPlotOptions } from "@modules/InplaceVolumesNew/typesAndEnums";
import { BarSortBy } from "@modules/InplaceVolumesNew/view/utils/plotly/bar";

export const INPLACE_VOLUMES_PLOT_OPTIONS_SCHEMA: JTDSchemaType<InplaceVolumesPlotOptions> = {
    properties: {
        histogramType: { enum: Object.values(HistogramType) },
        histogramBins: { type: "int32" },
        barSortBy: { enum: Object.values(BarSortBy) },
        showStatisticalMarkers: { type: "boolean" },
        showRealizationPoints: { type: "boolean" },
        sharedXAxis: { type: "boolean" },
        sharedYAxis: { type: "boolean" },
        hideConstants: { type: "boolean" },
        showPercentageInHistogram: { type: "boolean" },
    },
} as const;
