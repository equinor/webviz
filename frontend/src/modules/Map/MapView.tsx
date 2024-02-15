import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ContentError, ContentInfo } from "@modules/_shared/components/ContentMessage";
import { useSurfaceDataQueryByAddress } from "@modules_shared/Surface";
import SubsurfaceViewer from "@webviz/subsurface-viewer";

import { MapState } from "./MapState";

//-----------------------------------------------------------------------------------------------------------
export function MapView(props: ModuleViewProps<MapState>) {
    const surfaceAddress = props.viewContext.useStoreValue("surfaceAddress");

    const statusWriter = useViewStatusWriter(props.viewContext);
    const surfDataQuery = useSurfaceDataQueryByAddress(surfaceAddress);

    const isLoading = surfDataQuery.isFetching;
    statusWriter.setLoading(isLoading);

    const hasError = surfDataQuery.isError;
    if (hasError) {
        statusWriter.addError("Error fetching surface data");
    }

    const surfData = surfDataQuery.data;
    return (
        <div className="relative w-full h-full flex flex-col">
            {hasError ? (
                <ContentError>Error loading surface data</ContentError>
            ) : isLoading ? (
                <ContentInfo>Loading surface data</ContentInfo>
            ) : !surfData ? (
                <ContentInfo>Could not find surface data for the current selection</ContentInfo>
            ) : (
                <SubsurfaceViewer
                    id="deckgl"
                    layers={[
                        {
                            "@@type": "MapLayer",
                            id: "mesh-layer",
                            // Drop conversion as soon as SubsurfaceViewer accepts typed arrays
                            meshData: Array.from(surfData.valuesFloat32Arr),
                            frame: {
                                origin: [surfData.x_ori, surfData.y_ori],
                                count: [surfData.x_count, surfData.y_count],
                                increment: [surfData.x_inc, surfData.y_inc],
                                rotDeg: surfData.rot_deg,
                            },

                            contours: [0, 100],
                            isContoursDepth: true,
                            gridLines: false,
                            material: true,
                            smoothShading: true,
                            colorMapName: "Physics",
                        },
                    ]}
                />
            )}
        </div>
    );
}
