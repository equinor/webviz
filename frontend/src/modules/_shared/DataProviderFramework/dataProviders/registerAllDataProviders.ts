import { DataProviderType } from "./dataProviderTypes";
import { DrilledWellTrajectoriesProvider } from "./implementations/DrilledWellTrajectoriesProvider";
import { DrilledWellborePicksProvider } from "./implementations/DrilledWellborePicksProvider";

// Avoid issues with circular dependencies by using dynamic import
// for the DataProviderRegistry module and registering the data providers after the module is loaded.
try {
    await import("./DataProviderRegistry").then(({ DataProviderRegistry }) => {
        DataProviderRegistry.registerDataProvider(
            DataProviderType.DRILLED_WELLBORE_PICKS,
            DrilledWellborePicksProvider,
        );
        DataProviderRegistry.registerDataProvider(
            DataProviderType.DRILLED_WELL_TRAJECTORIES,
            DrilledWellTrajectoriesProvider,
        );
    });
} catch (error) {
    console.error("Error registering data providers:", error);
}
