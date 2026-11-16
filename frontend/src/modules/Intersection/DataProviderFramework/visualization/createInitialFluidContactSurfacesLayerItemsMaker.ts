import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type {
    EsvLayerItemsMaker,
    TransformerArgs,
} from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    InitialFluidContactSurfacesData,
    InitialFluidContactSurfacesSettings,
    InitialFluidContactSurfacesStoredData,
} from "../customDataProviderImplementations/InitialFluidContactSurfacesProvider";
import type { IntersectionInjectedData } from "../injectedDataType";

import { createSurfaceIntersectionLayerItemsMaker } from "./createSurfacesLayerItemsMaker";

export function createInitialFluidContactSurfacesLayerItemsMaker({
    id,
    name,
    isLoading,
    getData,
    getSetting,
}: TransformerArgs<
    InitialFluidContactSurfacesSettings,
    InitialFluidContactSurfacesData,
    InitialFluidContactSurfacesStoredData,
    IntersectionInjectedData
>): EsvLayerItemsMaker | null {
    const data = getData();
    const colorSet = getSetting(Setting.COLOR_SET);

    if (!data || !colorSet || isLoading) {
        return null;
    }

    return createSurfaceIntersectionLayerItemsMaker(id, name, data, colorSet);
}
