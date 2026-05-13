import React from "react";

import type { FilterContext, GetPickingInfoParams, LayersList, UpdateParameters } from "@deck.gl/core";
import { Layer } from "@deck.gl/core";
import type { GeoJsonLayerProps } from "@deck.gl/layers";
import { GeoJsonLayer } from "@deck.gl/layers";
import { Icon } from "@equinor/eds-core-react";
import { wellbore } from "@equinor/eds-icons";
import type { BoundingBox3D } from "@webviz/subsurface-viewer";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";
import type { MarkerData } from "@webviz/subsurface-viewer/dist/layers/wells/layers/flatWellMarkersLayer";
import type { WellFeature } from "@webviz/subsurface-viewer/dist/layers/wells/types";
import { GetBoundingBox } from "@webviz/subsurface-viewer/dist/layers/wells/utils/spline";
import { SubLayerId } from "@webviz/subsurface-viewer/dist/layers/wells/wellsLayer";

import type { ReadoutProperty } from "../components/Readout/types";
import type { LayerPickInfoWithReadout } from "../utils/subsurfaceViewerLayers";
import {
    getFlowReadout,
    getDepthFromSubsurfaceReadout,
    getMarkerReadout,
    getWellMetaReadout,
} from "../utils/subsurfaceViewerLayers";

export class AdjustedWellsLayer extends WellsLayer {
    static layerName: string = "AdjustedWellsLayer";

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("labels")) {
            return context.viewport.zoom > -2;
        }

        return true;
    }

    updateState(params: UpdateParameters<WellsLayer>): void {
        super.updateState(params);
        const { props, changeFlags } = params;
        if (props.reportBoundingBox && changeFlags.dataChanged) {
            props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }
    }

    private calcBoundingBox(): BoundingBox3D {
        if (!this.state.data) {
            return [0, 0, 0, 0, 0, 0];
        }

        const bbox = GetBoundingBox(this.state.data);
        console.debug("AdjustedWellsLayer bounding box", bbox);
        return bbox;
    }

    renderLayers(): LayersList {
        const layers = super.renderLayers();

        if (!Array.isArray(layers)) {
            return layers;
        }

        const colorsLayer = layers.find((layer) => {
            if (!(layer instanceof Layer)) {
                return false;
            }

            return layer.id.includes(SubLayerId.COLORS);
        });

        if (!(colorsLayer instanceof GeoJsonLayer)) {
            return layers;
        }

        const newColorsLayer = new GeoJsonLayer(
            super.getSubLayerProps({
                ...colorsLayer.props,
                data: colorsLayer.props.data,
                pickable: true,
                stroked: false,
                pointRadiusUnits: "meters",
                lineWidthUnits: "meters",
                pointRadiusScale: this.props.pointRadiusScale,
                lineWidthScale: this.props.lineWidthScale,
                lineBillboard: true,
                pointBillboard: true,
                id: "colors",
                lineWidthMinPixels: 1,
                lineWidthMaxPixels: 5,
                // autoHighlight: true,
                onHover: () => {},
            } as GeoJsonLayerProps),
        );

        return [newColorsLayer, ...layers.filter((layer) => layer !== colorsLayer)];
    }

    getPickingInfo({ info, sourceLayer }: GetPickingInfoParams): LayerPickInfoWithReadout<WellFeature> {
        const superInfo = super.getPickingInfo({ info });
        // The well's layer modifies the z-coordinate during picking, so we need to scale it back so readouts are correct
        if (superInfo.coordinate && superInfo.coordinate.length === 3) {
            const zScale = this.props.modelMatrix ? this.props.modelMatrix[10] : 1;
            superInfo.coordinate[2] *= zScale;
        }

        // -- Guard
        if (!info.object || !sourceLayer || info.index === -1) return superInfo;

        let wellFeature: WellFeature;
        const properties: ReadoutProperty[] = [];

        properties.push(...getDepthFromSubsurfaceReadout(superInfo));

        if (sourceLayer.id.endsWith(SubLayerId.MARKERS)) {
            const wellMarker = superInfo.object as any as MarkerData<WellFeature>;
            wellFeature = wellMarker.sourceObject;

            properties.push(...getMarkerReadout(wellMarker));
        } else {
            wellFeature = info.object as WellFeature;
        }

        properties.push(...getWellMetaReadout(wellFeature));
        properties.push(...getFlowReadout(wellFeature));

        return {
            ...superInfo,
            readout: {
                group: "Wells",
                // Don't want to elevate the file to a .tsx just for the icon, so manually creating icon
                icon: React.createElement(Icon, { className: "size-[inherit]", data: wellbore }),
                name: wellFeature.properties.name,
                properties: properties,
            },
        };
    }
}
