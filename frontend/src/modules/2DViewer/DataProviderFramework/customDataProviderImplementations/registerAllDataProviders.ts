import { DataProviderRegistry } from "@modules/_shared/DataProviderFramework/dataProviders/DataProviderRegistry";

import { ObservedSurfaceProvider } from "./ObservedSurfaceProvider";
import { CustomDataProviderType } from "./dataProviderTypes";

DataProviderRegistry.registerDataProvider(CustomDataProviderType.OBSERVED_SURFACE, ObservedSurfaceProvider);
