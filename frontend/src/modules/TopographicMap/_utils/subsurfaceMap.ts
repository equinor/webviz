import { WellBoreTrajectory_api } from "@api";

export type SurfaceMeshLayerSettings = {
    contours?:boolean|number[]
    gridLines?:boolean
    smoothShading?:boolean
    material?:boolean
};


export type SurfaceMeta = {
    x_ori: number;
    y_ori: number;
    x_count: number;
    y_count: number;
    x_inc: number;
    y_inc: number;
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    val_min: number;
    val_max: number;
    rot_deg: number;
};

const defaultSurfaceSettings: SurfaceMeshLayerSettings = {
    contours: false,
    gridLines: false,
    smoothShading: false,
    material: false,
};

export function createSurfaceMeshLayer(
    surfaceMeta: SurfaceMeta,
    mesh_data: string,
    surfaceSettings?: SurfaceMeshLayerSettings
): Record<string, unknown> {
    surfaceSettings = surfaceSettings || defaultSurfaceSettings;
    return {
        "@@type": "MapLayer",
        id: "mesh-layer",
        meshData: mesh_data,
        frame: {
            origin: [surfaceMeta.x_ori, surfaceMeta.y_ori],
            count: [surfaceMeta.x_count, surfaceMeta.y_count],
            increment: [surfaceMeta.x_inc, surfaceMeta.y_inc],
            rotDeg: surfaceMeta.rot_deg,
        },

        contours: surfaceSettings.contours ? [0, 100] : false,
        isContoursDepth: surfaceSettings.contours,
        gridLines: surfaceSettings.gridLines,
        material: surfaceSettings.material,
        smoothShading: surfaceSettings.smoothShading,
        colorMapName: "Physics",
    };
}

export function createWellboreTrajectoryLayer(wellTrajectories: WellBoreTrajectory_api[]): Record<string, unknown> {
    let features: Record<string, unknown>[] = wellTrajectories.map((wellTrajectory) => {
        return wellTrajectoryToGeojsonGeometryCollection(wellTrajectory);
    });
    let data: Record<string, unknown> = {
        type: "FeatureCollection",
        unit: "m",
        features: features,
    };
    return {
        "@@type": "WellsLayer",
        id: "wells-layer",
        data: data,
        refine: false,
    };
}

function wellTrajectoryToGeojsonGeometryCollection(wellTrajectory: WellBoreTrajectory_api): Record<string, unknown> {
    let point: Record<string, unknown> = {
        type: "Point",
        coordinates: [wellTrajectory.easting_arr[0], wellTrajectory.northing_arr[0], -wellTrajectory.tvd_msl_arr[0]],
    };
    let coordinates: Record<string, unknown> = {
        type: "LineString",
        coordinates: zipCoords(wellTrajectory.easting_arr, wellTrajectory.northing_arr, wellTrajectory.tvd_msl_arr),
    };
    let geometryCollection: Record<string, unknown> = {
        type: "Feature",
        geometry: {
            type: "GeometryCollection",
            geometries: [point, coordinates],
        },
        properties: {
            name: wellTrajectory.unique_wellbore_identifier,
            color: [0, 0, 0, 255],
            md: [wellTrajectory.md_arr],
        },
    };

    return geometryCollection;
}

function zipCoords(x_arr: number[], y_arr: number[], z_arr: number[]): number[][] {
    let coords: number[][] = [];
    for (let i = 0; i < x_arr.length; i++) {
        coords.push([x_arr[i], y_arr[i], -z_arr[i]]);
    }

    return coords;
}
