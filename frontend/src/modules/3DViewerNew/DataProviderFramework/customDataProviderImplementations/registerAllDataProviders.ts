import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { CustomDataProviderType } from "./dataProviderTypes";
import { RealizationSeismicCrosslineProvider } from "./RealizationSeismicCrosslineProvider";
import { RealizationSeismicInlineProvider } from "./RealizationSeismicInlineProvider";
import { RealizationSeismicDepthSliceProvider } from "./RealizationSeismicDepthProvider";

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
