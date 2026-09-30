import {
    CompositeLayer,
    type FilterContext,
    type GetPickingInfoParams,
    type Layer,
    type LayerContext,
    type PickingInfo,
} from "@deck.gl/core";
import { PathLayer, TextLayer } from "@deck.gl/layers";
import type { ExtendedLayerProps } from "@webviz/subsurface-viewer";

import type { CategoricalReadout, ReadoutProperty } from "@modules/_shared/components/Readout/types";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";
import { lengthAlongAtXyPosition } from "@modules/_shared/utils/polylineHoverUtils";
import type { Polyline } from "@modules/_shared/utils/subsurfaceViewer/PolylinesPlugin";

export type PolylinesLayerProps = ExtendedLayerProps & {
    id: string;
    polylines: Polyline[];
    selectedPolylineId?: string;
    hoverable?: boolean;
};

export type PolylinesLayerPickingInfo = PickingInfo<Polyline> & {
    polylineId?: string;
    name?: string;
    coordinates?: number[];
};

export function isPolylinesLayerPickingInfo(info: PickingInfo): info is PolylinesLayerPickingInfo {
    return Object.keys(info).includes("polylineId");
}

function formatMeters(value: number | undefined): string {
    if (value == null || Number.isNaN(value)) {
        return "-";
    }
    return formatNumber(value, { unit: "m", maxNumDecimalPlaces: 2 });
}

/**
 * Builds the readout shown in the ReadoutWrapper when hovering/clicking a polyline.
 *
 * Expects a pick whose coordinate has already been un-scaled (as the ReadoutWrapper does before
 * handing picks to the readout box) - the vertical scale is not known at this level.
 */
export function getPolylinesLayerReadout(pickingInfo: PolylinesLayerPickingInfo): CategoricalReadout | null {
    const polyline = pickingInfo.object as Polyline | undefined;
    if (!polyline || !pickingInfo.polylineId) {
        return null;
    }

    const properties: ReadoutProperty[] = [];
    const coordinate = pickingInfo.coordinate ?? pickingInfo.coordinates;

    if (coordinate && coordinate.length >= 2) {
        if (polyline.path.length >= 2) {
            properties.push({
                name: "Length along path",
                value: lengthAlongAtXyPosition(polyline.path, coordinate[0], coordinate[1]),
                format: formatMeters,
            });
        }
        properties.push({ name: "X", value: coordinate[0], format: formatMeters });
        properties.push({ name: "Y", value: coordinate[1], format: formatMeters });
        if (coordinate.length >= 3) {
            properties.push({ name: "Z", value: coordinate[2], format: formatMeters });
        }
    }

    return {
        group: "Polylines",
        name: polyline.name || "Polyline",
        properties,
    };
}

export class PolylinesLayer extends CompositeLayer<PolylinesLayerProps> {
    static layerName: string = "PolylinesLayer";

    // @ts-expect-error - deck.gl types are wrong
    state!: {
        hoveredPolylineIndex: number | null;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initializeState(_: LayerContext): void {
        this.setState({
            hoveredPolylineIndex: null,
        });
    }

    onHover(info: PickingInfo): boolean {
        if (!this.props.hoverable) {
            return false;
        }
        if (info.index === undefined) {
            return false;
        }

        const hoveredPolylineIndex = info.index;
        this.setState({ hoveredPolylineIndex });

        return false;
    }

    getPickingInfo({ info }: GetPickingInfoParams): PolylinesLayerPickingInfo {
        if (info && info.sourceLayer && info.object !== undefined) {
            return {
                ...info,
                name: info.object.name,
                polylineId: info.object.id,
                coordinates: info.coordinate,
            };
        }

        return info;
    }

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("labels")) {
            return context.viewport.zoom > -5;
        }

        return true;
    }

    renderLayers(): Layer[] {
        const { hoveredPolylineIndex } = this.state;

        const layers: Layer[] = [];

        if (this.props.selectedPolylineId) {
            const selectedPolylineIndex = this.props.polylines.findIndex((p) => p.id === this.props.selectedPolylineId);
            if (selectedPolylineIndex !== -1) {
                layers.push(
                    new PathLayer({
                        ...this.getSubLayerProps({
                            id: `selected`,
                            data: [this.props.polylines[selectedPolylineIndex]],
                            getPath: (d: Polyline) => d.path,
                            getColor: (d: Polyline) => [d.color[0], d.color[1], d.color[2], 200],
                            getWidth: 30,
                            widthUnits: "meters",
                            widthMinPixels: 5,
                            widthMaxPixels: 20,
                            parameters: {
                                depthTest: false,
                            },
                            billboard: true,
                        }),
                    }),
                );
            }
        }

        if (hoveredPolylineIndex !== null && this.props.polylines[hoveredPolylineIndex] && this.props.hoverable) {
            layers.push(
                new PathLayer({
                    ...this.getSubLayerProps({
                        id: `hovered`,
                        data: [this.props.polylines[hoveredPolylineIndex]],
                        getPath: (d: Polyline) => d.path,
                        getColor: (d: Polyline) => [d.color[0], d.color[1], d.color[2], 100],
                        getWidth: 30,
                        widthUnits: "meters",
                        widthMinPixels: 6,
                        widthMaxPixels: 24,
                        parameters: {
                            depthTest: false,
                        },
                        billboard: true,
                    }),
                }),
            );
        }

        const polylineLabels: { label: string; position: number[]; angle: number; color: number[] }[] = [];
        for (const polyline of this.props.polylines) {
            if (polyline.path.length < 2) {
                continue;
            }
            const vector = [
                polyline.path[1][0] - polyline.path[0][0],
                polyline.path[1][1] - polyline.path[0][1],
                polyline.path[1][2] - polyline.path[0][2],
            ];
            const length = Math.sqrt(vector[0] ** 2 + vector[1] ** 2);
            const unitVector = [vector[0] / length, vector[1] / length, vector[2] / length];
            let angle = Math.atan2(unitVector[1], unitVector[0]) * (180 / Math.PI);
            if (angle > 90 || angle < -90) {
                angle += 180;
            }
            polylineLabels.push({
                label: polyline.name,
                position: [
                    polyline.path[0][0] + (unitVector[0] * length) / 2,
                    polyline.path[0][1] + (unitVector[1] * length) / 2,
                    polyline.path[0][2] + (unitVector[2] * length) / 2,
                ],
                angle,
                color: polyline.color,
            });
        }

        layers.push(
            new PathLayer({
                ...this.getSubLayerProps({
                    id: `polylines`,
                    data: this.props.polylines,
                    getPath: (d: Polyline) => d.path,
                    getColor: (d: Polyline) => d.color,
                    getWidth: 10,
                    widthUnits: "meters",
                    widthMinPixels: 3,
                    widthMaxPixels: 10,
                    pickable: false,
                    parameters: {
                        depthTest: false,
                    },
                    billboard: true,
                }),
            }),
            new TextLayer({
                ...this.getSubLayerProps({
                    id: `polylines-labels`,
                    data: polylineLabels,
                    getPosition: (d: any) => d.position,
                    getText: (d: any) => d.label,
                    getSize: 12,
                    sizeUnits: "meters",
                    sizeMinPixels: 16,
                    getAngle: (d: any) => d.angle,
                    getColor: [0, 0, 0],
                    parameters: {
                        depthTest: false,
                    },
                    billboard: false,
                    getBackgroundColor: [255, 255, 255, 100],
                    getBackgroundPadding: [10, 10],
                    getBackgroundBorderColor: [0, 0, 0, 255],
                    getBackgroundBorderWidth: 2,
                    getBackgroundElevation: 1,
                    background: true,
                }),
            }),
            new PathLayer({
                ...this.getSubLayerProps({
                    id: `polylines-hoverable`,
                    data: this.props.polylines,
                    getPath: (d: Polyline) => d.path,
                    getColor: (d: Polyline) => [d.color[0], d.color[1], d.color[2], 1],
                    getWidth: 50,
                    widthUnits: "meters",
                    widthMinPixels: 10,
                    widthMaxPixels: 20,
                    pickable: true,
                    parameters: {
                        depthTest: false,
                    },
                }),
            }),
        );

        return layers;
    }
}
