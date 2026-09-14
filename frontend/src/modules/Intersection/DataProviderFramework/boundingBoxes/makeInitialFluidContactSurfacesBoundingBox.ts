import type { BBox } from "@lib/utils/bbox";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type {
    InitialFluidContactSurfacesData,
    InitialFluidContactSurfacesSettings,
    InitialFluidContactSurfacesStoredData,
} from "../customDataProviderImplementations/InitialFluidContactSurfacesProvider";
import type { IntersectionInjectedData } from "../injectedDataType";

import { makeSurfaceIntersectionBoundingBox } from "./makeSurfacesBoundingBox";

export function makeInitialFluidContactSurfacesBoundingBox({
    getData,
    getStoredData,
    isLoading,
}: TransformerArgs<
    InitialFluidContactSurfacesSettings,
    InitialFluidContactSurfacesData,
    InitialFluidContactSurfacesStoredData,
    IntersectionInjectedData
>): BBox | null {
    const data = getData();
    const polyline = getStoredData("polylineWithSectionLengths");

    if (!data || !polyline || isLoading) {
        return null;
    }

    return makeSurfaceIntersectionBoundingBox(data);
}
