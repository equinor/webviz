import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { CustomDataProviderType } from "./dataProviderTypes";
import { RealizationSeismicCrosslineProvider } from "./RealizationSeismicCrosslineProvider";
import { RealizationSeismicDepthSliceProvider } from "./RealizationSeismicDepthProvider";
import { RealizationSeismicInlineProvider } from "./RealizationSeismicInlineProvider";

DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.REALIZATION_SEISMIC_CROSSLINE,
    RealizationSeismicCrosslineProvider,
);
DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.REALIZATION_SEISMIC_INLINE,
    RealizationSeismicInlineProvider,
);
DataProviderRegistry.registerDataProvider(
    CustomDataProviderType.REALIZATION_SEISMIC_DEPTH_SLICE,
    RealizationSeismicDepthSliceProvider,
);
