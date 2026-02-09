import type {
    Layer,
    LayersList,
    UpdateParameters,
    Position as GlPosition,
    FilterContext,
    Position,
    Color,
    LayerProps,
} from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import { DataFilterExtension } from "@deck.gl/extensions";
import { GeoJsonLayer } from "@deck.gl/layers";
import { GL } from "@luma.gl/constants";
import type { WellFeature } from "@webviz/subsurface-viewer";
import { LabelOrientation, WellLabelLayer } from "@webviz/subsurface-viewer/dist/layers/wells/layers/wellLabelLayer";
import type { Feature, FeatureCollection, Geometry, LineString } from "geojson";
import { inRange, sortBy, zip, zipWith } from "lodash";

import { point2Distance, subtractVec2, vec2FromArray } from "@lib/utils/vec2";
import type { Vec2 } from "@lib/utils/vec2";
import { simplifyWellTrajectoryRadialDist } from "@modules/_shared/utils/wellbore";

import { getCoordinateForMd, getSegmentIndexForMd } from "../WellsLayer/_private/wellTrajectoryUtils";

import { DashedSectionsPathLayer } from "./DashedSectionsPathLayer";
import type { TrajectoryFilterExtensionProps } from "./TvdFilterExtension";
import { buildPerforationMarkerGeology, buildScreenMarkerGeology } from "./wellMarkers";

type WellboreProperties = {
    uuid: string;
    identifier: string;
    purpose: string;
    status: string;
    mdArr: number[];
    tvdArr: number[];
    // filterValueFlags: (0 | 1)[];
    // TODO: This migth not fit how we want to do segments
    segmentArr: string[];
};

type WellboreMarkerProperties = {
    //
    uuid: string;
    identifier: string;
    purpose: string;
    status: string;
    type: "perforation" | "screen";
    md: number;
    tvd: number;
    segment: string;
};

type WellboreTrajectoryFeature = Feature<LineString, WellboreProperties>;
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

export type FormationSegmentData = {
    segmentIdent: string;
    mdEnter: number;
    mdExit: number;
};

export type WellboreData = {
    uniqueIdentifier: string;
    uuid: string;
    purpose: string;
    status: string;
    well: WellData;
    perforations: PerforationData[];
    screens: WellboreScreenData[];
    formationSegments: FormationSegmentData[];
    trajectory: WellboreDataTrajectory;
};

type WellboreDataTrajectory = {
    mdArr: Array<number>;
    tvdMslArr: Array<number>;
    eastingArr: Array<number>;
    northingArr: Array<number>;
};

const SIMPLIFICATION_RADIAL_DIST = 1.5;
const REQUIRE_MD_MATCH_THRESHOLD = 0;

function buildWellboreProperties(
    simplifiedTrajectory: WellboreDataTrajectory,
    wellboreData: WellboreData,
): WellboreProperties & WellFeature["properties"] {
    const segmentArr = simplifiedTrajectory.mdArr.map((md) => {
        return (
            wellboreData.formationSegments.find((seg) => seg.mdEnter <= md && seg.mdExit > md)?.segmentIdent ??
            // TODO: Better name for "outside"
            "OUTSIDE FILTER"
        );
    });

    return {
        md: [simplifiedTrajectory.mdArr],
        uuid: wellboreData.uuid,
        identifier: wellboreData.uniqueIdentifier,
        name: wellboreData.uniqueIdentifier,
        purpose: wellboreData.purpose,
        status: wellboreData.status,
        mdArr: simplifiedTrajectory.mdArr,
        tvdArr: simplifiedTrajectory.tvdMslArr,
        segmentArr: segmentArr,
    };
}

function createSimplifiedTrajectory(trajectory: WellboreDataTrajectory) {
    return simplifyWellTrajectoryRadialDist(trajectory, SIMPLIFICATION_RADIAL_DIST, (point1, point2) => {
        const vecPoint1 = vec2FromArray([point1.easting, point1.northing]);
        const vecPoint2 = vec2FromArray([point2.easting, point2.northing]);

        return point2Distance(vecPoint1, vecPoint2);
    });
}

function getMdsForTvds(trajectory: WellboreDataTrajectory, ...tvds: number[]) {
    if (!tvds.length) return [];

    const { tvdMslArr, mdArr } = trajectory;
    const sortedTvdsToAdd = tvds.toSorted((a, b) => b - a);

    const requiredMds = [] as number[];

    let tvdToAdd = sortedTvdsToAdd.pop();

    for (let index = 0; index < mdArr.length - 1; index++) {
        const md = mdArr[index];
        const tvd = tvdMslArr[index];

        const nextMd = mdArr[index + 1];
        const nextTvd = tvdMslArr[index + 1];

        if (tvdToAdd === undefined) break;
        if (!inRange(tvdToAdd, tvd + REQUIRE_MD_MATCH_THRESHOLD, nextTvd - REQUIRE_MD_MATCH_THRESHOLD)) continue;

        const interpolatedT = (tvdToAdd - tvd) / (nextTvd - tvd);
        const interpolatedMd = md + interpolatedT * (nextMd - md);

        requiredMds.push(interpolatedMd);
        tvdToAdd = sortedTvdsToAdd.pop();
    }

    return requiredMds;
}

function ensureTrajectoryPointAtMds(trajectory: WellboreDataTrajectory, ...mds: number[]): WellboreDataTrajectory {
    if (!mds.length) return trajectory;

    const { eastingArr, northingArr, tvdMslArr, mdArr } = trajectory;

    const vec3Trajectory = zipWith(eastingArr, northingArr, tvdMslArr, (x, y, z) => ({ x, y, z }));

    const newEastingArr = [...eastingArr];
    const newNorthingArr = [...northingArr];
    const newTvdMslArr = [...tvdMslArr];
    const newMdArr = [...mdArr];

    for (const md of mds) {
        const segmentIndex = getSegmentIndexForMd(md, newMdArr); // Closest *preceding* point
        if (segmentIndex === -1) continue; // MD not on trajectory

        const segmentMd = newMdArr[segmentIndex];

        if (!inRange(md, segmentMd - REQUIRE_MD_MATCH_THRESHOLD, segmentMd + REQUIRE_MD_MATCH_THRESHOLD)) {
            const point = getCoordinateForMd(md, newMdArr, vec3Trajectory);

            if (point) {
                //Inject the point *after* the point we located
                vec3Trajectory.splice(segmentIndex + 1, 0, point);

                newEastingArr.splice(segmentIndex + 1, 0, point?.x);
                newNorthingArr.splice(segmentIndex + 1, 0, point?.y);
                newTvdMslArr.splice(segmentIndex + 1, 0, point?.z);
                newMdArr.splice(segmentIndex + 1, 0, md);
            }
        }
    }

    return {
        ...trajectory,
        eastingArr: newEastingArr,
        northingArr: newNorthingArr,
        tvdMslArr: newTvdMslArr,
        mdArr: newMdArr,
    };
}

function isTvdFiltered(tvd: number, tvdFilterValue: undefined | (number | undefined)[]): boolean {
    // ! Assumes tvd-range has been sanitized
    let isFiltered = false;

    if (tvdFilterValue?.length) {
        if (tvdFilterValue[0] !== undefined) {
            isFiltered ||= tvd < tvdFilterValue[0];
        }
        if (tvdFilterValue[1] !== undefined) {
            isFiltered ||= tvd > tvdFilterValue[1];
        }
    }

    return isFiltered;
}

function isMdFiltered(md: number, mdFilterValue: undefined | (number | undefined)[]): boolean {
    let isFiltered = false;

    if (mdFilterValue) {
        if (mdFilterValue[0] !== undefined) {
            isFiltered ||= md < mdFilterValue[0];
        }
        if (mdFilterValue[1] !== undefined) {
            isFiltered ||= md > mdFilterValue[1];
        }
    }

    return isFiltered;
}

function isSegmentFiltered(segment: string, segmentFilterValue: undefined | string[]) {
    if (!segmentFilterValue?.length) return false;

    return !segmentFilterValue.includes(segment);
}

function getAllRequiredMds(
    trajectory: WellboreDataTrajectory,
    screens: WellboreScreenData[],
    formationSegments: FormationSegmentData[],
    layerProps: RichWellsLayerProps,
) {
    const mds = new Set<number>();

    formationSegments.forEach((fs) => {
        mds.add(fs.mdEnter);
        mds.add(fs.mdExit);
    });

    screens.forEach((screen) => {
        mds.add(screen.mdTop);
        mds.add(screen.mdBottom);
    });

    layerProps.mdFilterValue?.forEach((md) => {
        if (md !== undefined) mds.add(md);
    });

    layerProps.tvdFilterValue?.forEach((tvd) => {
        if (tvd === undefined) return;
        getMdsForTvds(trajectory, tvd).forEach((md) => mds.add(md));
    });

    return sortBy([...mds]);
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

function buildWellborePerforationMarkers(
    perforations: PerforationData[],
    wellboreTrajectory: WellboreDataTrajectory,
    wellboreProperties: WellboreProperties,
): WellboreMarkerFeature[] {
    const { eastingArr, northingArr, tvdMslArr } = wellboreTrajectory;

    const features: WellboreMarkerFeature[] = [];

    const vec3Trajectory = zipWith(eastingArr, northingArr, tvdMslArr, (x, y, z) => ({ x, y, z }));

    for (const perforation of perforations) {
        // Perforations have a little bit of length (the size of the hole?). Use the point between as the geometry's anchor
        // const perforationAnchorMd = (perforation.mdTop + perforation.mdBottom) / 2;
        const perforationAnchorMd = perforation.mdTop;

        const rotation = getNormalAngleAtMd(perforationAnchorMd, wellboreTrajectory);

        if (rotation === null) continue;

        const perforationCoordinate = getCoordinateForMd(perforationAnchorMd, wellboreTrajectory.mdArr, vec3Trajectory);
        const segmentIndex = getSegmentIndexForMd(perforationAnchorMd, wellboreTrajectory.mdArr);

        if (perforationCoordinate) {
            features.push({
                type: "Feature",
                id: wellboreProperties.uuid,
                geometry: buildPerforationMarkerGeology(perforationCoordinate, rotation),
                properties: {
                    ...wellboreProperties,
                    type: "screen",
                    md: perforationAnchorMd,
                    tvd: perforationCoordinate.z,
                    segment: wellboreProperties.segmentArr[segmentIndex],
                },
            });
        }
    }

    return features;
}

function mergeScreenSegments(screenData: WellboreScreenData[]): WellboreScreenData[] {
    screenData = sortBy(screenData, (data) => data.mdTop); // TODO: This should be sorted by the backend, preferably?

    return screenData.reduce((acc, screen) => {
        if (acc.at(-1) && acc.at(-1)!.mdBottom === screen.mdTop) {
            acc.at(-1)!.mdBottom = screen.mdBottom;
            return acc;
        } else {
            return [...acc, { ...screen }];
        }
    }, screenData);
}

function buildWellboreScreenMarkers(
    screenData: WellboreScreenData[],
    wellboreTrajectory: WellboreDataTrajectory,
    wellboreProperties: WellboreProperties,
): WellboreMarkerFeature[] {
    const markerFeatures = [] as WellboreMarkerFeature[];

    const { eastingArr, northingArr, tvdMslArr } = wellboreTrajectory;

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
            // TODO: Optimize to avoid running over again
            const segmentIndexStart = getSegmentIndexForMd(screenMdStart, wellboreTrajectory.mdArr);
            const segmentIndexEnd = getSegmentIndexForMd(screenMdEnd, wellboreTrajectory.mdArr);

            if (coordinateStart && coordinateEnd) {
                markerFeatures.push({
                    type: "Feature",
                    geometry: buildScreenMarkerGeology(coordinateStart, rotationStart, "start"),
                    properties: {
                        ...wellboreProperties,
                        type: "screen",
                        tvd: coordinateStart.z,
                        md: screenMdStart,
                        segment: wellboreProperties.segmentArr[segmentIndexStart],
                    },
                });
                markerFeatures.push({
                    type: "Feature",
                    geometry: buildScreenMarkerGeology(coordinateEnd, rotationEnd, "end"),
                    properties: {
                        ...wellboreProperties,
                        type: "screen",
                        tvd: coordinateEnd.z,
                        md: screenMdEnd,
                        segment: wellboreProperties.segmentArr[segmentIndexEnd],
                    },
                });
            }
        }

        screenMdStart = null;
        screenMdEnd = null;
    }

    return markerFeatures;
}

type WellboreTrajectory = {
    properties: WellboreProperties;
    path: Position[];
    dashedMdIntervals?: [from: number, to: number][];
};

export type RichWellsLayerProps = {
    data: WellboreData[];

    getIsSelected?: (d: WellboreData) => boolean;

    discardFilteredSections?: boolean;
    segmentFilterValue?: string[];
    tvdFilterValue?: [min: number | undefined, max: number | undefined];
    mdFilterValue?: [min: number | undefined, max: number | undefined];
    getWellColor?: (wellboreUwi: string) => { r: number; g: number; b: number };
    isWellboreSelected?: (uuid: string) => boolean;
};

export class RichWellsLayer extends CompositeLayer<RichWellsLayerProps> {
    static layerName = "RichWellsLayer";

    declare state: {
        // TODO: Heads

        // ? Should these be in a single object?
        wellboreTrajectories: WellboreTrajectory[];
        wellboreMarkers: FeatureCollection;

        // TODO: Only needed for label layer
        geoTrajectories: FeatureCollection;

        // TODO: Markers as sublayerdata?
    };

    constructor(props: RichWellsLayerProps & LayerProps) {
        super(props);

        this.getWellboreColor = this.getWellboreColor.bind(this);
    }

    updateState({ props, changeFlags }: UpdateParameters<this>) {
        // TODO: Optimize. Less recomputations
        if (!changeFlags.dataChanged) return;

        const wellboreTrajectories: WellboreTrajectory[] = [];
        const wellboreMarkers: FeatureCollection = {
            type: "FeatureCollection",
            features: [],
        };

        const geoTrajectories: FeatureCollection = {
            type: "FeatureCollection",
            features: [],
        };

        // TODO: Only update things based on change-flags?

        for (const wellboreData of props.data) {
            const mergedScreenSegments = mergeScreenSegments(wellboreData.screens);

            // Simplify trajectory path for 2D (remove stacked points for vertical sections of the well)
            const __simplifiedTrajectory = createSimplifiedTrajectory(wellboreData.trajectory);

            // Filter and dashes need the trajectories vertex to be present
            // TODO: Consider putting it inside the layer
            // TODO: The "DataFilter" extension from deck.gl is able to interpolate the values between vertexes (numeric filter only)
            const requiredMds = getAllRequiredMds(
                __simplifiedTrajectory,
                mergedScreenSegments,
                wellboreData.formationSegments,
                props,
            );

            const wellboreTrajectory = ensureTrajectoryPointAtMds(__simplifiedTrajectory, ...requiredMds);
            const wellboreProperties = buildWellboreProperties(wellboreTrajectory, wellboreData);

            // Build assorted markers along the path
            const perforationMarkers = buildWellborePerforationMarkers(
                wellboreData.perforations,
                wellboreTrajectory,
                wellboreProperties,
            );

            const screenMarkers = buildWellboreScreenMarkers(
                mergedScreenSegments,
                wellboreTrajectory,
                wellboreProperties,
            );

            // Stored dashed intervals
            const dashedSections = [] as [from: number, to: number][];
            for (let index = 0; index < screenMarkers.length; index += 2) {
                const startMarker = screenMarkers[index];
                const endMarker = screenMarkers[index + 1];

                dashedSections.push([startMarker.properties.md, endMarker.properties.md]);
            }

            // Create positions for the final trajectory path
            const path = zip(
                wellboreTrajectory.eastingArr,
                wellboreTrajectory.northingArr,
                wellboreTrajectory.tvdMslArr,
            ) as [number, number, number][];

            wellboreTrajectories.push({
                properties: wellboreProperties,
                dashedMdIntervals: dashedSections,
                path: path,
            });

            wellboreMarkers.features.push(...perforationMarkers, ...screenMarkers);

            geoTrajectories.features.push({
                type: "Feature",
                properties: wellboreProperties,
                geometry: {
                    type: "GeometryCollection",
                    geometries: [
                        {
                            type: "LineString",
                            coordinates: path,
                        },
                    ],
                },
            });
        }

        this.setState({ wellboreTrajectories, wellboreMarkers, geoTrajectories });
    }

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id === "welltrajectory-labels-layer") {
            return context.viewport.zoom > -4;
        }

        return true;
    }

    private getWellboreColor(d: { properties: WellboreProperties }): Color {
        if (this.props?.isWellboreSelected?.(d.properties.uuid)) {
            return [255, 0, 0];
        }

        // Use the custom color function if provided
        if (this.props?.getWellColor) {
            const color = this.props.getWellColor(d.properties.identifier);
            return [color.r, color.g, color.b];
        }

        return [130, 130, 130];
    }

    renderLayers(): Layer | null | LayersList {
        const sharedProps: Partial<LayerProps & TrajectoryFilterExtensionProps & Record<string, any>> = {
            lineWidthMinPixels: 3,
            getLineWidth: 6,

            positionFormat: "XY",
            trajectoryDiscardFiltered: !!this.props.discardFilteredSections,
            pickable: true,
            autoHighlight: true,
            highlightColor: [50, 50, 50],
        };

        const layers = [
            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // ---[ Main path ]--- --- --- --- --- --- --- --- --- --- ---
            new DashedSectionsPathLayer({
                ...sharedProps,
                data: this.state.wellboreTrajectories,
                id: "well-path-layer",
                getColor: this.getWellboreColor,
                widthMinPixels: sharedProps.lineWidthMinPixels,
                getWidth: sharedProps.getLineWidth,
                getPath: (d: WellboreTrajectory) => d.path,
                dashArray: [3, 3],
                isSegmentDashed: (d: WellboreTrajectory, segmentIndex: number) => {
                    if (!d.dashedMdIntervals) return false;

                    const segmentMd = d.properties.mdArr[segmentIndex];
                    const inDashRange = d.dashedMdIntervals?.some(([start, end]) =>
                        // Offset the range a little, to account for points that are slightly close to the point
                        inRange(segmentMd, start - REQUIRE_MD_MATCH_THRESHOLD, end - REQUIRE_MD_MATCH_THRESHOLD),
                    );

                    return inDashRange;
                },

                extensions: [new DataFilterExtension({ filterSize: 1 })],
                filterRange: [1, 1],
                getFilterValue: (d: WellboreTrajectory) =>
                    d.path.map((_, i) => {
                        const md = d.properties.mdArr[i];
                        const tvd = d.properties.tvdArr[i];
                        const segment = d.properties.segmentArr[i];

                        let segmentIsValid = true;

                        segmentIsValid &&= !isTvdFiltered(tvd, this.props.tvdFilterValue);
                        segmentIsValid &&= !isMdFiltered(md, this.props.mdFilterValue);
                        segmentIsValid &&= !isSegmentFiltered(segment, this.props.segmentFilterValue);

                        return Number(segmentIsValid);
                    }),

                // Disable depth test to render on top of other layers
                // parameters: { [GL.DEPTH_TEST]: false },
            }),

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // ---[ Well markers ]---- --- --- --- --- --- --- --- --- ---
            new GeoJsonLayer({
                ...sharedProps,
                id: "well-markers-layer",
                data: this.state.wellboreMarkers,

                getLineColor: this.getWellboreColor,
                getFillColor: [0, 0, 0, 0],
                getLineWidth: 2,

                extensions: [new DataFilterExtension({ filterSize: 1 })],
                filterRange: [1, 1],
                getFilterValue: (d: WellboreMarkerFeature) => {
                    const { md, tvd, segment } = d.properties;

                    let segmentIsValid = true;

                    segmentIsValid &&= !isTvdFiltered(tvd, this.props.tvdFilterValue);
                    segmentIsValid &&= !isMdFiltered(md, this.props.mdFilterValue);
                    segmentIsValid &&= !isSegmentFiltered(segment, this.props.segmentFilterValue);

                    return Number(segmentIsValid);
                },
            }),

            // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
            // ---[ Well labels ]- --- --- --- --- --- --- --- --- --- ---
            new WellLabelLayer({
                id: "welltrajectory-labels-layer",

                data: this.state.geoTrajectories.features,
                mergeLabels: false,
                autoPosition: false,
                getPositionAlongPath: 1,
                getAlignmentBaseline: "top",
                getTextAnchor: "end",
                // Performance tanks if there's too many labels
                orientation:
                    this.state.geoTrajectories.features.length < 200
                        ? LabelOrientation.TANGENT
                        : LabelOrientation.HORIZONTAL,

                positionFormat: "XY",

                // @ts-expect-error --- Subsurface type is a bit too aggressive
                getText: (d: WellboreTrajectoryFeature) => d.properties.identifier,
                getBackgroundColor: [255, 255, 255, 255 * 0.1],
                // getColor: []
                getBorderWidth: 0,
                background: true,
                visible: true,

                // @ts-expect-error -- Parameter type doesn't expose these
                parameters: { [GL.DEPTH_TEST]: false },
            }),
        ];

        return layers;
    }
}
