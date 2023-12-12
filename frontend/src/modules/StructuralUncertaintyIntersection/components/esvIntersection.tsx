import React from "react";

import { SurfaceIntersectionPoints_api } from "@api";
import {
    Controller,
    GeomodelLayerV2,
    GridLayer,
    PixiRenderApplication,
    ReferenceLine,
    ReferenceLineLayer,
    SurfaceData,
    WellborepathLayer,
} from "@equinor/esv-intersection";

import { isEqual } from "lodash";

import { addMDOverlay } from "../utils/esvIntersectionControllerUtils";
import { makeReferenceSystemFromTrajectoryXyzPoints } from "../utils/esvIntersectionDataConversion";

type EsvIntersectionProps = {
    width: number;
    height: number;
    zScale: number;
    extension: number;
    wellborePath: number[][] | null;
    statisticalSurfaceIntersectionPoints?: SurfaceIntersectionPoints_api[] | null;
    realizationsSurfaceIntersectionPoints?: SurfaceIntersectionPoints_api[] | null;
};

export const EsvIntersection: React.FC<EsvIntersectionProps> = (props) => {
    const containerDiv = React.useRef<HTMLDivElement | null>(null);
    const controller = React.useRef<Controller | null>(null);
    const pixiContent = React.useRef<PixiRenderApplication | null>(null);
    const [previousWellborePath, setPreviousWellborePath] = React.useState<number[][] | null>(null);
    const width = props.width;
    const height = props.height - 100;
    const seaAndRKBLayerData: ReferenceLine[] = [
        { text: "RKB", lineType: "dashed", color: "black", depth: 0 },
        { text: "MSL", lineType: "wavy", color: "blue", depth: 30 },
        { text: "Seabed", lineType: "solid", color: "slategray", depth: 91.1, lineWidth: 2 },
    ];
    const seaAndRKBLayer = new ReferenceLineLayer("sea-and-rkb-layer", { data: seaAndRKBLayerData });
    React.useEffect(function initializeEsvIntersectionController() {
        if (containerDiv.current) {
            const axisOptions = { xLabel: "x", yLabel: "y", unitOfMeasure: "m" };
            controller.current = new Controller({
                container: containerDiv.current,
                axisOptions,
            });
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            pixiContent.current = new PixiRenderApplication({ width: width, height: height });

            // Initialize/configure controller
            addMDOverlay(controller.current);
            controller.current.addLayer(new GridLayer("gridLayer"));
            controller.current.addLayer(new WellborepathLayer("wellBorePathLayer"));
            controller.current.addLayer(
                new GeomodelLayerV2(pixiContent.current, "statisticalSurfaceLayer", { order: 3, layerOpacity: 0.6 })
            );
            controller.current.addLayer(
                new GeomodelLayerV2(pixiContent.current, "realizationsSurfaceLayer", { order: 4, layerOpacity: 0.6 })
            );
            controller.current.addLayer(seaAndRKBLayer);
            controller.current.setBounds([10, 1000], [0, 3000]);
            controller.current.setViewport(1000, 1650, 6000);
            controller.current.zoomPanHandler.zFactor = props.zScale;
        }
        return () => {
            controller.current?.destroy();
        };
    }, []);
    if (!isEqual(previousWellborePath, props.wellborePath)) {
        setPreviousWellborePath(props.wellborePath);

        controller.current?.getLayer("statisticalSurfaceLayer")?.clearData();
        controller.current?.getLayer("realizationsSurfaceLayer")?.clearData();
    }
    if (controller.current && props.wellborePath) {
        controller.current.adjustToSize(Math.max(0, width), Math.max(0, height - 100));
        const referenceSystem = makeReferenceSystemFromTrajectoryXyzPoints(props.wellborePath);
        controller.current.setReferenceSystem(referenceSystem);

        if (props.statisticalSurfaceIntersectionPoints) {
            const layerData = statisticalSurfaceIntersectionsToSurfaceData(props.statisticalSurfaceIntersectionPoints);

            controller.current.getLayer("statisticalSurfaceLayer")?.setData(layerData);
        }
        if (props.realizationsSurfaceIntersectionPoints) {
            const layerData = realizationsSurfaceIntersectionsToSurfaceData(
                props.realizationsSurfaceIntersectionPoints
            );

            controller.current.getLayer("realizationsSurfaceLayer")?.setData(layerData);
        }
    }
    return <div ref={containerDiv} style={{ width: width, height: height }} />;
};

function statisticalSurfaceIntersectionsToSurfaceData(intersections: SurfaceIntersectionPoints_api[]): SurfaceData {
    const surfaceIndicesWithLabels: { name: string; idx: number }[] = [];
    intersections.forEach((intersection, idx) => {
        if (intersection.name !== surfaceIndicesWithLabels[surfaceIndicesWithLabels.length - 1]?.name) {
            surfaceIndicesWithLabels.push({ name: intersection.name, idx: idx });
        }
    });
    const geolayerdata: SurfaceData = {
        areas: [],

        lines: intersections.map((intersection, idx) => {
            return {
                data: intersection.z_array.map((z: number, idx) => {
                    return [intersection.cum_length[idx], z];
                }),
                color: "red",
                id: intersection.name,
                label: surfaceIndicesWithLabels.find((surfaceWithLabel) => surfaceWithLabel.idx === idx)?.name ?? "",
                width: 10,
            };
        }),
    };
    return geolayerdata;
}
function realizationsSurfaceIntersectionsToSurfaceData(intersections: SurfaceIntersectionPoints_api[]): SurfaceData {
    const surfaceIndicesWithLabels: { name: string; idx: number }[] = [];
    intersections.forEach((intersection, idx) => {
        if (intersection.name !== surfaceIndicesWithLabels[surfaceIndicesWithLabels.length - 1]?.name) {
            surfaceIndicesWithLabels.push({ name: intersection.name, idx: idx });
        }
    });
    const geolayerdata: SurfaceData = {
        areas: [],

        lines: intersections.map((intersection, idx) => {
            return {
                data: intersection.z_array.map((z: number, idx) => {
                    return [intersection.cum_length[idx], z];
                }),
                color: "black",
                id: intersection.name,
                label: surfaceIndicesWithLabels.find((surfaceWithLabel) => surfaceWithLabel.idx === idx)?.name ?? "",
                width: 1,
            };
        }),
    };
    return geolayerdata;
}
