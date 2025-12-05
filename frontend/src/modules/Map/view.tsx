import React from "react";

import type { Options } from "@hey-api/client-axios";
import { useQuery } from "@tanstack/react-query";
import SubsurfaceViewer from "@webviz/subsurface-viewer";

import type { SurfaceDef_api, GetStatisticalSurfaceDataHybridData_api } from "@api";
import { getStatisticalSurfaceDataHybrid, getStatisticalSurfaceDataHybridQueryKey } from "@api";
import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useLroProgress, wrapLongRunningQuery } from "@framework/utils/lro/longRunningApiCalls";
import type { Vec2 } from "@lib/utils/vec2";
import { rotatePoint2Around } from "@lib/utils/vec2";
import { ContentError, ContentInfo } from "@modules/_shared/components/ContentMessage";
import { usePropagateQueryErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";
import { useSurfaceDataQueryByAddress } from "@modules/_shared/Surface";
import type { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import { transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";

import type { Interfaces } from "./interfaces";

export function MapView(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const surfaceAddress = props.viewContext.useSettingsToViewInterfaceValue("surfaceAddress");

    const statusWriter = useViewStatusWriter(props.viewContext);
    const [hybridProgressText, setHybridProgressText] = React.useState<string | null>(null);

    let activeQueryType: "normal" | "hybrid" | null = null;
    const enableHybridEndpoint = true;
    if (surfaceAddress) {
        if (enableHybridEndpoint && surfaceAddress.addressType === "STAT") {
            activeQueryType = "hybrid";
        } else {
            activeQueryType = "normal";
        }
    }

    const normal_dataQuery = useSurfaceDataQueryByAddress(surfaceAddress, "float", null, activeQueryType === "normal");

    const hybrid_apiFunctionArgs: Options<GetStatisticalSurfaceDataHybridData_api, false> = {
        query: {
            surf_addr_str: surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : "DUMMY",
        },
    };
    const hybrid_queryKey = getStatisticalSurfaceDataHybridQueryKey(hybrid_apiFunctionArgs);
    const hybrid_queryOptions = wrapLongRunningQuery({
        queryFn: getStatisticalSurfaceDataHybrid,
        queryFnArgs: hybrid_apiFunctionArgs,
        queryKey: hybrid_queryKey,
        delayBetweenPollsSecs: 0.5,
        maxTotalDurationSecs: 120,
    });
    const hybrid_dataQuery = useQuery({ ...hybrid_queryOptions, enabled: activeQueryType === "hybrid" });

    function handleProgress(progressMessage: string | null) {
        if (progressMessage) {
            console.debug(`HYBRID PROGRESS: ${progressMessage}`);
            setHybridProgressText(progressMessage);
        }
    }
    useLroProgress(hybrid_queryOptions.queryKey, handleProgress);

    const activeDataQuery = activeQueryType === "hybrid" ? hybrid_dataQuery : normal_dataQuery;

    const isLoading = activeDataQuery.isFetching;
    statusWriter.setLoading(isLoading);
    if (!isLoading && hybridProgressText) {
        setHybridProgressText(null);
    }

    const hasError = activeDataQuery.isError;
    usePropagateQueryErrorToStatusWriter(activeDataQuery, statusWriter);

    let surfData: SurfaceDataFloat_trans | undefined = undefined;
    if (normal_dataQuery?.data) {
        surfData = normal_dataQuery.data;
    } else if (hybrid_dataQuery?.data) {
        surfData = transformSurfaceData(hybrid_dataQuery.data) as SurfaceDataFloat_trans;
    }

    return (
        <div className="relative w-full h-full flex flex-col">
            {hasError ? (
                <ContentError>Error loading surface data</ContentError>
            ) : isLoading ? (
                <ContentInfo>Loading surface data... {hybridProgressText ?? ""}</ContentInfo>
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
