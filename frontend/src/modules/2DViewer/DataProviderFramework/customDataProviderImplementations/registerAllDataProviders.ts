import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { CustomDataProviderType } from "./dataProviderTypes";
import { RealizationGridProvider } from "./RealizationGridProvider";

DataProviderRegistry.registerDataProvider(CustomDataProviderType.REALIZATION_GRID_2D, RealizationGridProvider);
