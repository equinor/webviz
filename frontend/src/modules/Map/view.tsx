import type React from "react";

import SubsurfaceViewer from "@webviz/subsurface-viewer";

import type { SurfaceDef_api } from "@api";
import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import type { Vec2 } from "@lib/utils/vec2";
import { rotatePoint2Around } from "@lib/utils/vec2";
import { ContentError, ContentInfo } from "@modules/_shared/components/ContentMessage";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { useSurfaceDataQueryByAddress } from "@modules_shared/Surface";

import { Options } from "@hey-api/client-axios";
import { useQuery } from "@tanstack/react-query";
import { wrapLongRunningQuery } from "@framework/utils/longRunningApiCalls";
import { LroProgressInfo_api } from "@api";
import { getStatisticalSurfaceDataHybrid, GetStatisticalSurfaceDataHybridData_api } from "@api";
import { getStatisticalSurfaceDataHybridQueryKey } from "@api";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";


import type { Interfaces } from "./interfaces";

export function MapView(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const surfaceAddress = props.viewContext.useSettingsToViewInterfaceValue("surfaceAddress");

    const statusWriter = useViewStatusWriter(props.viewContext);

    //const surfDataQuery = useSurfaceDataQueryByAddress(surfaceAddress, "png", null, true);
    //const surfDataQuery = useSurfaceDataQueryByAddress(surfaceAddress, "float", null, true);


    const surfDataQuery_general = useSurfaceDataQueryByAddress(surfaceAddress, "float", null, surfaceAddress?.addressType !== "STAT");


    const queryFnOptions: Options<GetStatisticalSurfaceDataHybridData_api, false> = {
        query: {
            surf_addr_str: surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : "DUMMY",
        },
    };
    const queryKey = getStatisticalSurfaceDataHybridQueryKey(queryFnOptions);

    function handleProgress(progress: LroProgressInfo_api | undefined) {
        if (progress) {
            console.log(`PROGRESS: ${progress.progress_message}`);
            statusWriter.setDebugMessage(`PROGRESS: ${progress.progress_message}`);
        }
    }

    const wrappedQuery = wrapLongRunningQuery({
        queryFn: getStatisticalSurfaceDataHybrid,
        queryFnArgs: queryFnOptions,
        queryKey: queryKey,
        pollIntervalMs: 500,
        maxRetries: 240,
        onProgress: handleProgress
    });

    const surfDataQuery_stat = useQuery({ ...wrappedQuery, enabled: surfaceAddress?.addressType === "STAT" });



    const isLoading = surfDataQuery_general.isFetching;
    statusWriter.setLoading(isLoading);

    const hasError = surfDataQuery_general.isError;
    usePropagateApiErrorToStatusWriter(surfDataQuery_general, statusWriter);


    let surfData: SurfaceDataFloat_trans | undefined = undefined;
    if (surfDataQuery_general?.data) {
        surfData = surfDataQuery_general.data;
    }
    else if (surfDataQuery_stat?.data) {
        surfData = transformSurfaceData(surfDataQuery_stat.data) as SurfaceDataFloat_trans;
    }

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
                            "@@typedArraySupport": true,
                            id: "mesh-layer",
                            meshData: surfData.valuesFloat32Arr,
                            frame: {
                                origin: [surfData.surface_def.origin_utm_x, surfData.surface_def.origin_utm_y],
                                count: [surfData.surface_def.npoints_x, surfData.surface_def.npoints_y],
                                increment: [surfData.surface_def.inc_x, surfData.surface_def.inc_y],
                                rotDeg: surfData.surface_def.rot_deg,
                            },

                            contours: [0, 100],
                            isContoursDepth: true,
                            gridLines: false,
                            material: true,
                            smoothShading: true,
                            colorMapName: "Physics",
                        },
                        // {
                        //     // Experiment with showing PNG image in a ColormapLayer
                        //     "@@type": "ColormapLayer",
                        //     id: "image-layer",
                        //     image: `data:image/png;base64,${surfData.png_image_base64}`,
                        //     bounds: _calcBoundsForRotationAroundUpperLeftCorner(surfData.surface_def),
                        //     rotDeg: surfData.surface_def.rot_deg,
                        //     valueRange: [surfData.value_min, surfData.value_max],
                        //     colorMapName: "Physics",
                        // },
                    ]}
                />
            )}
        </div>
    );
}

// Calculate Deck.gl style bounds that are suitable for usage with a rotated image in the ColormapLayer,
// which expects rotation to be specified around the upper left corner of the image.
//
// The ColormapLayer derives from deck.gl's BitmapLayer, which expects bounds in the form [left, bottom, right, top]
//
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _calcBoundsForRotationAroundUpperLeftCorner(surfDef: SurfaceDef_api): number[] {
    const width = (surfDef.npoints_x - 1) * surfDef.inc_x;
    const height = (surfDef.npoints_y - 1) * surfDef.inc_y;
    const orgRotPoint: Vec2 = { x: surfDef.origin_utm_x, y: surfDef.origin_utm_y };
    const orgTopLeft: Vec2 = { x: surfDef.origin_utm_x, y: surfDef.origin_utm_y + height };

    const transTopLeft: Vec2 = rotatePoint2Around(orgTopLeft, orgRotPoint, (surfDef.rot_deg * Math.PI) / 180);
    const tLeft = transTopLeft.x;
    const tBottom = transTopLeft.y - height;
    const tRight = transTopLeft.x + width;
    const tTop = transTopLeft.y;

    const bounds = [tLeft, tBottom, tRight, tTop];

    return bounds;
}
