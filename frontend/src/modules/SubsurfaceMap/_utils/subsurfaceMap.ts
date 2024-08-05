import { SurfaceDef_api, PolygonData_api, WellboreTrajectory_api } from "@api";

export type SurfaceMeshLayerSettings = {
    contours?: boolean | number[];
    gridLines?: boolean;
    smoothShading?: boolean;
    material?: boolean;
};

export type ViewSettings = {
    show3d: boolean;
};

const defaultSurfaceSettings: SurfaceMeshLayerSettings = {
    contours: false,
    gridLines: false,
    smoothShading: false,
    material: false,
};

export function createNorthArrowLayer(visible?: boolean): Record<string, unknown> {
    return {
        "@@type": "NorthArrow3DLayer",
        id: "north-arrow-layer",
        visible: visible === undefined ? true : visible,
    };
}
export function createAxesLayer(
    bounds: [number, number, number, number, number, number],
    visible?: boolean
): Record<string, unknown> {
    return {
        "@@type": "AxesLayer",
        id: "axes-layer",
        visible: visible === undefined ? true : visible,
        bounds: bounds,
    };
}
export function createSurfaceMeshLayer(
    surfaceDef: SurfaceDef_api,
    mesh_data: Float32Array,
    surfaceSettings?: SurfaceMeshLayerSettings | null,
    property_data?: Float32Array | null
): Record<string, unknown> {
    surfaceSettings = surfaceSettings || defaultSurfaceSettings;
    return {
        "@@type": "MapLayer",
        "@@typedArraySupport": true,
        id: "mesh-layer",
        meshData: mesh_data,
        propertiesData: property_data,
        frame: {
            origin: [surfaceDef.origin_utm_x, surfaceDef.origin_utm_y],
            count: [surfaceDef.npoints_x, surfaceDef.npoints_y],
            increment: [surfaceDef.inc_x, surfaceDef.inc_y],
            rotDeg: surfaceDef.rot_deg,
        },

        contours: surfaceSettings.contours || false,
        isContoursDepth: true,
        gridLines: surfaceSettings.gridLines,
        material: surfaceSettings.material,
        smoothShading: surfaceSettings.smoothShading,
        colorMapName: "Continuous",
    };
}
export function createSurfacePolygonsLayer(surfacePolygons: PolygonData_api[]): Record<string, unknown> {
    const features: Record<string, unknown>[] = surfacePolygons.map((polygon) => {
        return surfacePolygonsToGeojson(polygon);
    });
    const data: Record<string, unknown> = {
        type: "FeatureCollection",
        unit: "m",
        features: features,
    };
    return {
        "@@type": "GeoJsonLayer",
        id: "surface-polygons-layer",
        data: data,
        opacity: 0.5,
        parameters: {
            depthTest: false,
        },
        pickable: true,
    };
}
function surfacePolygonsToGeojson(surfacePolygon: PolygonData_api): Record<string, unknown> {
    const data: Record<string, unknown> = {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [zipCoords(surfacePolygon.x_arr, surfacePolygon.y_arr, surfacePolygon.z_arr)],
        },
        properties: { name: surfacePolygon.poly_id, color: [0, 0, 0, 255] },
    };
    return data;
}
export function createWellboreTrajectoryLayer(wellTrajectories: WellboreTrajectory_api[]): Record<string, unknown> {
    const features: Record<string, unknown>[] = wellTrajectories.map((wellTrajectory) => {
        return wellTrajectoryToGeojson(wellTrajectory);
    });
    const data: Record<string, unknown> = {
        type: "FeatureCollection",
        unit: "m",
        features: features,
    };
    return {
        "@@type": "WellsLayer",
        id: "wells-layer",
        data: data,
        refine: false,
        lineStyle: { width: 2 },
        wellHeadStyle: { size: 1 },
        pickable: true,
    };
}
export function wellTrajectoryToGeojson(wellTrajectory: WellboreTrajectory_api): Record<string, unknown> {
    const point: Record<string, unknown> = {
        type: "Point",
        coordinates: [wellTrajectory.eastingArr[0], wellTrajectory.northingArr[0], -wellTrajectory.tvdMslArr[0]],
    };
    const coordinates: Record<string, unknown> = {
        type: "LineString",
        coordinates: zipCoords(wellTrajectory.eastingArr, wellTrajectory.northingArr, wellTrajectory.tvdMslArr),
    };
    const geometryCollection: Record<string, unknown> = {
        type: "Feature",
        geometry: {
            type: "GeometryCollection",
            geometries: [point, coordinates],
        },
        properties: {
            uuid: wellTrajectory.wellboreUuid,
            name: wellTrajectory.uniqueWellboreIdentifier,
            uwi: wellTrajectory.uniqueWellboreIdentifier,

            color: [0, 0, 0, 100],
            md: [wellTrajectory.mdArr],
        },
    };

    return geometryCollection;
}
export function createWellBoreHeaderLayer(wellTrajectories: WellboreTrajectory_api[]): Record<string, unknown> {
    const data: Record<string, unknown>[] = wellTrajectories.map((wellTrajectory) => {
        return wellHeaderMarkerToGeojson(
            wellTrajectory.eastingArr[0],
            wellTrajectory.northingArr[0],
            -wellTrajectory.tvdMslArr[0],
            wellTrajectory.uniqueWellboreIdentifier,
            wellTrajectory.wellboreUuid
        );
    });

    return {
        "@@type": "TextLayer",
        id: "well-header-layer",
        data: data,
        getText: (d: Record<string, Record<string, string>>) => d.uwi,
        getPosition: (d: Record<string, number[]>) => d.coordinates,
        getSize: 12,
        getAngle: 0,
        getTextAnchor: "middle",
        getAlignmentBaseline: "center",
        pickable: true,
    };
}

function wellHeaderMarkerToGeojson(
    x: number,
    y: number,
    z: number,
    uwi: string,
    uuid: string
): Record<string, unknown> {
    // let data: Record<string, unknown> = {
    //     type: "Feature",
    //     geometry: {
    //         type: "Point",
    //         coordinates: [x, y, z],
    //     },
    //     properties: { name: label },
    // };
    const data: Record<string, unknown> = {
        coordinates: [x, y, z],
        uuid: uuid,
        uwi: uwi,
    };
    return data;
}

function zipCoords(x_arr: number[], y_arr: number[], z_arr: number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < x_arr.length; i++) {
        coords.push([x_arr[i], y_arr[i], -z_arr[i]]);
    }

    return coords;
}
