import type { Layer, LayersList, UpdateParameters, Position as GlPosition, FilterContext } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import type { GeoJsonLayerProps } from "@deck.gl/layers";
import { GeoJsonLayer } from "@deck.gl/layers";
import { GL } from "@luma.gl/constants";
import { LabelOrientation, WellLabelLayer } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import type { Feature, FeatureCollection, Geometry, LineString } from "geojson";
import { sortBy, zipWith } from "lodash";

import { point2Distance, subtractVec2, vec2FromArray } from "@lib/utils/vec2";
import type { Vec2 } from "@lib/utils/vec2";
import { simplifyWellTrajectoryRadialDist } from "@modules/_shared/utils/wellbore";

// TODO: These should be in a shared trajectory util
import { getCoordinateForMd, getSegmentIndexForMd } from "../WellsLayer/_private/wellTrajectoryUtils";

import type { TvdFilterExtensionProps } from "./TvdFilterExtension";
import { TvdFilterExtension } from "./TvdFilterExtension";
import { buildPerforationMarkerGeology, buildScreenMarkerGeology } from "./wellMarkers";

type WellboreTrajectoryProperties = {
    uuid: string;
    identifier: string;
    purpose: string;
    status: string;
    mdArr: number[];
    tvdArr: number[];
};

type WellboreMarkerProperties = {
    uuid: string;
    identifier: string;
    purpose: string;
    status: string;
    type: "perforation" | "screen";
    md: number;
    tvd: number;
};

type WellboreTrajectoryFeature = Feature<LineString, WellboreTrajectoryProperties>;
type WellboreMarkerFeature = Feature<Geometry, WellboreMarkerProperties>;

// TODO: Take in more detailed data
// export type WellboreData = WellboreTrajectory_api;

type WellData = {
    uuid: string;
    uniqueIdentifier: string;
    easting: number;
    northing: number;
};

type WellboreScreenData = {
    mdTop: number;
    mdBottom: number;
    symbolName: string | null;
    description: string | null;
    comment: string | null;
};

type PerforationData = {
    mdTop: number;
    mdBottom: number;
    tvdTop: number;
    tvdBottom: number;
    status: string;
    completionMode: string;
    dateShot: string | null;
    dateClosed: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Might use later...
type WellboreTrajectoryPath = {
    uuid: string;
    solidPath: GlPosition[];
    dashedPath: GlPosition[];
};

export type WellboreData = {
    uniqueIdentifier: string;
    uuid: string;
    purpose: string;
    status: string;
    well: WellData;
    perforations: PerforationData[];
    screens: WellboreScreenData[];
    trajectory: WellboreDataTrajectory;
};

type WellboreDataTrajectory = {
    mdArr: Array<number>;
    tvdMslArr: Array<number>;
    eastingArr: Array<number>;
    northingArr: Array<number>;
};

const SIMPLIFICATION_RADIAL_DIST = 1.5;

function getWellboreProperties(wellboreData: WellboreData): WellboreTrajectoryProperties {
    return {
        uuid: wellboreData.uuid,
        identifier: wellboreData.uniqueIdentifier,
        purpose: wellboreData.purpose,
        status: wellboreData.status,
        mdArr: wellboreData.trajectory.mdArr,
        tvdArr: wellboreData.trajectory.tvdMslArr,
    };
}

function createSimplifiedTrajectory(trajectory: WellboreDataTrajectory) {
    return simplifyWellTrajectoryRadialDist(trajectory, SIMPLIFICATION_RADIAL_DIST, (point1, point2) => {
        const vecPoint1 = vec2FromArray([point1.easting, point1.northing]);
        const vecPoint2 = vec2FromArray([point2.easting, point2.northing]);

        return point2Distance(vecPoint1, vecPoint2);
    });
}

// ? Make this a general util?
function getNormalAngleAtMd(md: number, trajectory: WellboreDataTrajectory): number | null {
    const { eastingArr, northingArr } = trajectory;

    const segmentIndex = getSegmentIndexForMd(md, trajectory.mdArr);

    if (segmentIndex === -1) return null;

    const segmentStartVec: Vec2 = { x: eastingArr[segmentIndex], y: northingArr[segmentIndex] };
    const segmentEndVec: Vec2 = { x: eastingArr[segmentIndex + 1], y: northingArr[segmentIndex + 1] };

    const dirVec: Vec2 = subtractVec2(segmentEndVec, segmentStartVec);
    const angle = Math.atan2(dirVec.y, dirVec.x);

    // This made other logic not work unexpectedly, make it optional?
    if (angle > Math.PI || angle < -Math.PI) {
        return angle + Math.PI;
    }

    return angle;
}

function buildTrajectoryGeoFeature(
    trajectory: WellboreDataTrajectory,
    wellboreProperties: WellboreTrajectoryProperties,
): WellboreTrajectoryFeature {
    return {
        type: "Feature",
        properties: wellboreProperties,
        geometry: {
            type: "LineString",
            // Only XY so it renders in 2D
            coordinates: zipWith(trajectory.eastingArr, trajectory.northingArr, trajectory.tvdMslArr),
        },
    };
}

// function buildWellboreMarker(
//     wellboreTrajectory: WellboreDataTrajectory,
//     wellboreProperties: WellboreTrajectoryProperties,
//     marker: TrajectoryMarker,
// ): WellboreMarkerFeature {

//     const markerProp = {
//         ...wellboreProperties,
//         tvd:
//     }

//     switch (marker.type) {
//         case "perforation":
//             break;

//         default:
//             break;
//     }
// }

function buildWellborePerforationMarkers(
    perforations: PerforationData[],
    wellboreTrajectory: WellboreDataTrajectory,
    wellboreProperties: WellboreTrajectoryProperties,
): WellboreMarkerFeature[] {
    const { eastingArr, northingArr, tvdMslArr } = wellboreTrajectory;

    const features: WellboreMarkerFeature[] = [];

    const vec3Trajectory = zipWith(eastingArr, northingArr, tvdMslArr, (x, y, z) => ({ x, y, z }));

    for (const perforation of perforations) {
        // Perforations have a little bit of length (the size of the hole?). Use the point between as the geometry's anchor
        const perforationAnchorMd = (perforation.mdTop + perforation.mdBottom) / 2;
        const rotation = getNormalAngleAtMd(perforationAnchorMd, wellboreTrajectory);

        if (rotation === null) continue;

        const perforationCoordinate = getCoordinateForMd(perforation.mdTop, wellboreTrajectory.mdArr, vec3Trajectory);

        if (perforationCoordinate) {
            // geometries.push();

            features.push({
                type: "Feature",
                id: wellboreProperties.uuid,
                geometry: buildPerforationMarkerGeology(perforationCoordinate, rotation),
                properties: {
                    ...wellboreProperties,
                    type: "screen",
                    md: perforationAnchorMd,
                    tvd: perforationCoordinate.z,
                },
            });
        }
    }

    return features;
}

function buildWellboreScreenMarkers(
    screenData: WellboreScreenData[],
    wellboreTrajectory: WellboreDataTrajectory,
    wellboreProperties: WellboreTrajectoryProperties,
): WellboreMarkerFeature[] {
    const { eastingArr, northingArr, tvdMslArr } = wellboreTrajectory;
    // const geometries = [] as Geometry[];
    const features = [] as WellboreMarkerFeature[];

    const vec3Trajectory = zipWith(eastingArr, northingArr, tvdMslArr, (x, y, z) => ({ x, y, z }));

    screenData = sortBy(screenData, (data) => data.mdTop); // TODO: This should be sorted by the backend, preferably?

    let screenMdStart = null;
    let screenMdEnd = null;

    for (let index = 0; index < screenData.length; index++) {
        // Some screen entries are adjacent. We only want to add markers at the start and end of the combined
        // screen length, so look for
        const screen = screenData[index];
        const nextScreen = screenData[index + 1];

        if (screenMdStart === null) screenMdStart = screen.mdTop;

        if (nextScreen?.mdTop !== undefined && screen.mdBottom >= nextScreen.mdTop) continue;
        else screenMdEnd = screen.mdBottom;

        const rotationStart = getNormalAngleAtMd(screenMdStart, wellboreTrajectory);
        const rotationEnd = getNormalAngleAtMd(screenMdEnd, wellboreTrajectory);

        if (rotationStart !== null && rotationEnd !== null) {
            const coordinateStart = getCoordinateForMd(screenMdStart, wellboreTrajectory.mdArr, vec3Trajectory);
            const coordinateEnd = getCoordinateForMd(screenMdEnd, wellboreTrajectory.mdArr, vec3Trajectory);

            if (coordinateStart && coordinateEnd) {
                features.push({
                    type: "Feature",
                    geometry: buildScreenMarkerGeology(coordinateStart, rotationStart, "start"),
                    properties: {
                        ...wellboreProperties,
                        type: "screen",
                        tvd: coordinateStart.z,
                        md: screenMdStart,
                    },
                });
                features.push({
                    type: "Feature",
                    geometry: buildScreenMarkerGeology(coordinateEnd, rotationEnd, "end"),
                    properties: {
                        ...wellboreProperties,
                        type: "screen",
                        tvd: coordinateEnd.z,
                        md: screenMdEnd,
                    },
                });
            }
        }

        screenMdStart = null;
        screenMdEnd = null;
    }

    return features;
}

export class RichWellsLayer extends CompositeLayer<{
    data: WellboreData[];
    tvdRange?: [number | undefined, number | undefined];
    isWellboreSelected?: (uuid: string) => boolean;
}> {
    static layerName = "RichWellsLayer";

    declare state: {
        wellboreTrajectories: FeatureCollection;
        wellboreMarkers: FeatureCollection;
    };

    updateState({ props, changeFlags }: UpdateParameters<this>) {
        if (!changeFlags.propsOrDataChanged) return;

        const wellboreTrajectories: FeatureCollection = {
            type: "FeatureCollection",
            features: [],
        };

        const wellboreMarkers: FeatureCollection = {
            type: "FeatureCollection",
            features: [],
        };

        for (const wellboreData of props.data) {
            const simplifiedTrajectory = createSimplifiedTrajectory(wellboreData.trajectory);

            const wellboreProperties = getWellboreProperties({ ...wellboreData, trajectory: simplifiedTrajectory });

            wellboreTrajectories.features.push(buildTrajectoryGeoFeature(simplifiedTrajectory, wellboreProperties));

            wellboreMarkers.features.push(
                ...buildWellborePerforationMarkers(wellboreData.perforations, simplifiedTrajectory, wellboreProperties),
                ...buildWellboreScreenMarkers(wellboreData.screens, simplifiedTrajectory, wellboreProperties),
            );
        }

        this.setState({ wellboreTrajectories, wellboreMarkers });
    }

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id === "welltrajectory-labels-layer") {
            return context.viewport.zoom > -4;
        }

        return true;
    }

    renderLayers(): Layer | null | LayersList {
        const sharedProps: Partial<GeoJsonLayerProps<any>> & Partial<TvdFilterExtensionProps> = {
            lineWidthMinPixels: 2,
            getLineWidth: 2,
            lineBillboard: true,
            positionFormat: "XY",

            getLineColor: (d) => {
                if (this.props?.isWellboreSelected?.(d.properties.uuid)) {
                    return [255, 0, 0];
                }
                return [130, 130, 130];
            },
            pickable: true,
            autoHighlight: true,
            highlightColor: [122, 8, 148],
            tvdRange: this.props.tvdRange,

            // TODO: Default opacity settings stacks overlapping elements
            // parameters: { blend: true, blendEquation: GL.MAX },
        };

        return [
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // ---[ Main path ]--- --- --- --- --- --- --- --- --- --- ---
            new GeoJsonLayer({
                ...sharedProps,
                id: "well-path-layer",
                data: this.state.wellboreTrajectories,
                positionFormat: "XY", // Force  2D rendering, even if we provide a z-value

                extensions: [new TvdFilterExtension()],

                getTvd: (d: any) => d.__source.object.properties.tvdArr,
            }),
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // ---[ Well markers ]---- --- --- --- --- --- --- --- --- ---
            new GeoJsonLayer({
                ...sharedProps,
                id: "well-markers-layer",
                data: this.state.wellboreMarkers,
                positionFormat: "XY",
                extensions: [new TvdFilterExtension()],

                getFillColor: [0, 0, 0, 0],

                getLineWidth: 1,

                getTvd: (d: any) => d.__source.object.properties.tvd,
            }),

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // ---[ Well labels ]- --- --- --- --- --- --- --- --- --- ---
            new WellLabelLayer({
                id: "welltrajectory-labels-layer",
                data: this.state.wellboreTrajectories.features.map((f) => ({
                    ...f,
                    geometry: {
                        type: "GeometryCollection",
                        geometries: [f.geometry],
                    },
                })),

                mergeLabels: false,
                autoPosition: false,
                getPositionAlongPath: 1,
                getAlignmentBaseline: "top",
                getTextAnchor: "end",
                positionFormat: "XY",
                orientation: LabelOrientation.TANGENT,

                // @ts-expect-error --- Subsurface type is a bit too aggressive
                getText: (d: WellboreTrajectoryFeature) => d.properties.identifier,
                getBackgroundColor: [255, 255, 255, 255 * 0.7],
                getBorderWidth: 0,
                background: true,

                // @ts-expect-error -- Parameter type doesn't expose these
                parameters: { [GL.DEPTH_TEST]: false },
            }),
        ];
    }
}
