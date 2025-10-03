/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Layer, LayersList, UpdateParameters } from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import type { PathStyleExtensionProps } from "@deck.gl/extensions";
import { PathStyleExtension } from "@deck.gl/extensions";
import { GeoJsonLayer, PathLayer } from "@deck.gl/layers";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { WellMarkersLayer } from "@webviz/subsurface-viewer/dist/layers";
import type { Position as GlPosition } from "deck.gl";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import { zipWith } from "lodash";

import type { WellboreTrajectory_api } from "@api";

// type AdvancedWellsLayerProps =

const patterns = ["dots", "hatch-1x", "hatch-2x", "hatch-cross"];

type WellboreTrajectoryFeatureProperties = {
    uuid: string;
    identifier: string;
    purpose: string;
    status: string;
};

type WellboreTrajectoryFeature = Feature<Geometry, WellboreTrajectoryFeatureProperties>;
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
    trajectory: {
        mdArr: Array<number>;
        tvdMslArr: Array<number>;
        eastingArr: Array<number>;
        northingArr: Array<number>;
    };
};

function createReferenceSystem(wellboreData: WellboreData) {
    const { eastingArr, northingArr, tvdMslArr } = wellboreData.trajectory;

    const pathCoords = zipWith(eastingArr, northingArr, tvdMslArr, (easting, northing, tvd) => {
        // TODO: TVD flip should be based on a setting
        return [easting, northing, -tvd];
    });

    const refSystem = new IntersectionReferenceSystem(pathCoords);
    refSystem.offset = tvdMslArr[0];
    return refSystem;
}

function wellboreToGeoJson(
    wellboreData: WellboreData,
    referenceSystem: IntersectionReferenceSystem,
): WellboreTrajectoryFeature {
    let lineCoordinateSets: Position[][] = [];

    lineCoordinateSets = [referenceSystem.path];
    //
    // if (!completions.length) {
    //     lineCoordinateSets = [referenceSystem.path];
    // } else {
    //     // let nextStop = referenceSystem.project(completions[0].start)
    //     const nextStop = completions[0].start;
    //     // let nextEnd  = referenceSystem.project(completions[0].end)
    //     const nextEnd = completions[0].end;
    //     const inBreak = false;
    //     const coordinateSet = [];
    //     referenceSystem.path.forEach((pos) => {
    //         console.log(pos);
    //     });
    //     // Each completion part will need to be a distinct f
    // }

    // for (const pos of referenceSystem.path) {
    // }

    // if (wellboreData.completions.length) {
    // }
    const pathGeometries: Geometry[] = [];
    // const pathGeometries = lineCoordinateSets.map<Geometry>((cords) => ({
    //     type: "LineString",
    //     coordinates: cords,
    // }));

    const perforationGeometries = wellboreData.screens.reduce<Geometry[]>((acc, perforation) => {
        const perfStart = mdToWorldPosition(perforation.mdTop, referenceSystem);
        const perfEnd = mdToWorldPosition(perforation.mdBottom, referenceSystem);

        return [...acc, { type: "Point", coordinates: perfStart }, { type: "Point", coordinates: perfEnd }];
    }, []);

    return {
        type: "Feature",
        properties: {
            uuid: wellboreData.uuid,
            identifier: wellboreData.uniqueIdentifier,
            purpose: wellboreData.purpose,
            status: wellboreData.status,
        },
        geometry: {
            type: "GeometryCollection",
            geometries: [...pathGeometries, ...perforationGeometries],
        },
    };
}

function mdToWorldPosition(md: number, referenceSystem: IntersectionReferenceSystem) {
    const [x, y] = referenceSystem.getPosition(md);
    const [, z] = referenceSystem.project(md);

    return [x, y, z] as [number, number, number];
}

function computePaths(
    wellboreData: WellboreData,
    referenceSystem: IntersectionReferenceSystem,
): WellboreTrajectoryPath {
    const solidPathSegments = [];
    const dashedPathSegments = [];

    let solidMdStart = 0;

    if (!wellboreData.screens.length) {
        solidPathSegments.push(...referenceSystem.path);
    }

    // TODO: Slow for a large set of wellbores
    for (const screen of wellboreData.screens) {
        // TODO: Is there a cleaner way to get the world position, instead of doing both curtain AND getPosition

        const solidCurtainPath = referenceSystem.getCurtainPath(solidMdStart, screen.mdTop, true);
        const dashedCurtainPath = referenceSystem.getCurtainPath(screen.mdTop, screen.mdBottom);

        solidPathSegments.push(
            ...solidCurtainPath.map((mdPoint) => [...referenceSystem.getPosition(mdPoint.md), mdPoint.point[1]]),
        );

        dashedPathSegments.push(
            ...dashedCurtainPath.map((mdPoint) => [...referenceSystem.getPosition(mdPoint.md), mdPoint.point[1]]),
        );

        solidMdStart = screen.mdBottom;
    }

    return {
        uuid: wellboreData.uuid,
        dashedPath: dashedPathSegments,
        solidPath: solidPathSegments,
    };
}

export class AdvancedWellsLayer extends CompositeLayer<{
    data: WellboreData[];
    isWellboreSelected?: (uuid: string) => boolean;
}> {
    declare state: {
        fullWellPath: FeatureCollection;
        // completions: WorldPositionCompletion[];
        completionFeatures: FeatureCollection;

        wellboreTrajectories: WellboreTrajectoryPath[];
    };

    // state!: {
    //     data: WellFeatureCollection | undefined;
    //     well: string;
    //     selectedMultiWells: string[];
    //     selection: [number, number];
    // };
    // 'constructor(props)

    updateState({ props, changeFlags }: UpdateParameters<this>) {
        // console.log("here", changeFlags);

        // if (!changeFlags.dataChanged) return;

        // const ref = createReferenceSystem(props.data);
        const pathDataFeatures = [];
        // const completions: WorldPositionCompletion[] = [];
        const completionFeatures: FeatureCollection = {
            type: "FeatureCollection",
            features: [],
        };

        const wellboreTrajectories = [];

        // const wellFeaturesByUuid = new Map<string, Feature>();

        for (const wellboreData of props.data) {
            const refSystem = createReferenceSystem(wellboreData);

            // if (!wellFeaturesByUuid.has(wellboreData.wellUuid)) {
            // }

            pathDataFeatures.push(wellboreToGeoJson(wellboreData, refSystem));
            // completionFeatures.features.push(completionToGeoJson(wellboreData, refSystem));

            // completions.push(
            //     ...wellboreData.completions.map<WorldPositionCompletion>((c) => {
            //         // const [startX, startY] = refSystem.getPosition(c.start);
            //         // const [, startZ] = refSystem.project(c.start);

            //         // const [endX, endY] = refSystem.getPosition(c.end);
            //         // const [, endZ] = refSystem.project(c.end);

            //         return {
            //             type: c.type,
            //             start: mdToWorldPos(c.start, refSystem),
            //             end: mdToWorldPos(c.end, refSystem),
            //         };
            //     }),
            // );

            wellboreTrajectories.push(computePaths(wellboreData, refSystem));
        }

        const fullWellPath: typeof this.state.fullWellPath = {
            type: "FeatureCollection",
            features: pathDataFeatures,
        };

        this.setState({ fullWellPath, completionFeatures, wellboreTrajectories });
    }

    renderLayers(): Layer | null | LayersList {
        return [
            // new PathLayer({
            //     data:
            // })

            new GeoJsonLayer({
                opacity: 0.1,
                // extensions: [new PathStyleExtension({ dash: true })],
                id: "well-path-layer",
                data: this.state.fullWellPath,
                lineWidthMinPixels: 1,
                getLineWidth: 1,
                pointBillboard: true,
                pointRadiusMinPixels: 6,
                getPointRadius: 12,

                // lineCapRounded: true,
                lineBillboard: true,
                getFillColor: [0, 0, 0, 0],
                // get
                // getLineWidth ()
                getLineColor: (d: WellboreTrajectoryFeature) => {
                    // if (this.props?.isWellboreSelected?.(d.properties)) {
                    //     return [255, 0, 0];
                    // }
                    if (this.props?.isWellboreSelected?.(d.properties.uuid)) {
                        return [255, 0, 0];
                    }
                    return [60, 60, 60];
                },

                // getDashArray: [3, 4],
                // dashJustified: true,
                pickable: true,
                // parameters: { depthTest: false },
            }),

            // new PathLayer<WellboreTrajectoryPath>({
            //     id: "trajectory-ghosts",
            // })

            // TODO: Might be better to have a single one
            new PathLayer<WellboreTrajectoryPath>({
                id: "trajectory-solid",
                billboard: true,
                miterLimit: 4,
                getWidth: 6,
                widthMinPixels: 2,
                data: this.state.wellboreTrajectories,
                getColor: (d) => {
                    if (this.props?.isWellboreSelected?.(d.uuid)) {
                        return [255, 0, 0];
                    }
                    return [60, 60, 60, 70];
                },
                getPath: (d) => d.solidPath,
            }),
            new PathLayer<WellboreTrajectoryPath, PathStyleExtensionProps>({
                id: "trajectory-dashed",
                extensions: [new PathStyleExtension({ dash: true, highPrecisionDash: true })],
                billboard: true,
                miterLimit: 1,
                // getWidth: 12,
                // widthMinPixels: 6,
                getWidth: 6,
                widthMinPixels: 2,
                data: this.state.wellboreTrajectories,
                getColor: (d) => {
                    if (this.props?.isWellboreSelected?.(d.uuid)) {
                        return [255, 0, 0];
                    }
                    return [60, 60, 60, 70];
                },
                getPath: (d) => d.dashedPath,
                getDashArray: [5, 5],

                dashGapPickable: true,
            }),

            // new WellMarkersLayer()

            // new GeoJsonLayer({
            //     id: "well-completions-layer",
            //     filled: true,
            //     data: this.state.completionFeatures,
            //     lineWidthMinPixels: 20,
            //     lineBillboard: true,
            //     getLineColor: [196, 40, 40],
            //     // parameters: { depthTest: false },

            //     // getLineColor: [60, 60, 60],
            //     // getFillColor: [60, 180, 240],

            //     extensions: [new FillStyleExtension({ pattern: true })],
            //     fillPatternMask: true,
            //     fillPatternAtlas:
            //         "https://raw.githubusercontent.com/visgl/deck.gl/master/examples/layer-browser/data/pattern.png",
            //     fillPatternMapping:
            //         "https://raw.githubusercontent.com/visgl/deck.gl/master/examples/layer-browser/data/pattern.json",
            //     getFillPattern: () => patterns[0],
            //     // // getFillPatternScale: 500,
            //     // getFillPatternOffset: [0, 0],

            //     // parameters: { depthTest: false },
            // }),

            // new LineLayer<WorldPositionCompletion>({
            //     id: "well-completions-layer",
            //     data: this.state.completions,
            //     getColor: [196, 40, 40],
            //     widthMinPixels: 20,
            //     getSourcePosition: (d) => d.start,
            //     getTargetPosition: (d) => d.end,
            // }),
        ];
    }
}
