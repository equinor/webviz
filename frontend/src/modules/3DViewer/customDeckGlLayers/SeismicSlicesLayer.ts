import { CompositeLayer, type Layer, type PickingInfo, type UpdateParameters } from "@deck.gl/core";
import type {
    ReportBoundingBoxAction,
    ExtendedLayerProps,
} from "@webviz/subsurface-viewer/dist/layers/utils/layerTools";
import type { BoundingBox3D } from "@webviz/subsurface-viewer/dist/utils";
import { isEqual } from "lodash-es";

import type { Geometry } from "@lib/utils/geometry";

import { getFenceGridCoordFromPoint } from "./SeismicFenceMeshLayer/_private/fenceSampling";
import { SeismicFenceGridLayer } from "./SeismicFenceMeshLayer/_private/SeismicFenceGridLayer";
import {
    SeismicFenceMeshLayer,
    type SeismicFence,
    type SeismicFenceMeshLayerProps,
} from "./SeismicFenceMeshLayer/SeismicFenceMeshLayer";

type HighlightState = {
    sectionId: string;
    traceIndex: number;
    sampleIndex: number;
} | null;

export type SeismicFenceWithId = {
    id: string;
    fence?: SeismicFence;
    loadingGeometry?: Geometry;
};

export type SeismicSlicesLayerProps = ExtendedLayerProps & {
    data: Array<SeismicFenceWithId>;
    colorMapFunction: SeismicFenceMeshLayerProps["colorMapFunction"];
    zIncreaseDownwards?: boolean;
    isLoading?: boolean;

    // Non-public property:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
};

export class SeismicSlicesLayer extends CompositeLayer<SeismicSlicesLayerProps> {
    static layerName = "SeismicSlicesLayer";

    // @ts-expect-error - deck.gl state typing
    state!: { highlight: HighlightState };

    initializeState(): void {
        this.setState({ highlight: null });
    }

    updateState({ changeFlags, props }: UpdateParameters<this>): void {
        if (props.reportBoundingBox && changeFlags.propsOrDataChanged) {
            props.reportBoundingBox({
                layerBoundingBox: this.calcBoundingBox(),
            });
        }
    }

    // deck.gl only calls updateAutoHighlight on the root of a composite chain (this layer), on every
    // hover pick. The mesh is `pickable: "3d"`, so `info.coordinate` is a real point on the slice —
    // invert it to the nearest grid node and push that down to the matching fence layer's spotlight.
    updateAutoHighlight(info: PickingInfo): void {
        const next = this.decodeHighlight(info);
        if (!isEqual(next, this.state.highlight)) {
            this.setState({ highlight: next });
        }
    }

    private decodeHighlight(info: PickingInfo): HighlightState {
        if (!info.picked || !info.coordinate || info.coordinate.length !== 3 || !info.sourceLayer) {
            return null;
        }
        const section = this.props.data.find(
            (candidate) => info.sourceLayer?.id === `${this.props.id}-${candidate.id}`,
        );
        if (!section?.fence) {
            return null;
        }

        // `info.coordinate` is common space (before the mesh modelMatrix, which scales Z by the
        // vertical exaggeration m[10]); undo that to get back to the fence's own coordinates.
        const zScale = (this.props.modelMatrix as ArrayLike<number> | undefined)?.[10] || 1;
        const meshSpacePoint = [info.coordinate[0], info.coordinate[1], info.coordinate[2] / zScale];

        const gridCoord = getFenceGridCoordFromPoint(section.fence, this.props.zIncreaseDownwards ?? false, meshSpacePoint);
        if (!gridCoord) {
            return null;
        }
        return {
            sectionId: section.id,
            traceIndex: Math.round(gridCoord.traceCoord),
            sampleIndex: Math.round(gridCoord.sampleCoord),
        };
    }

    renderLayers(): Layer[] {
        const { data: sections, colorMapFunction, zIncreaseDownwards, isLoading } = this.props;
        const { highlight } = this.state;

        const layers: Layer[] = sections.map(
            (section) =>
                new SeismicFenceMeshLayer(
                    this.getSubLayerProps({
                        id: section.id,
                        data: section.fence,
                        loadingGeometry: section.loadingGeometry,
                        colorMapFunction,
                        zIncreaseDownwards,
                        isLoading,
                    }),
                ),
        );

        // A single spotlight layer for the currently hovered section (it filters itself out on zoom).
        const highlightedFence = highlight && sections.find((s) => s.id === highlight.sectionId)?.fence;
        if (highlight && highlightedFence) {
            layers.push(
                new SeismicFenceGridLayer(
                    this.getSubLayerProps({
                        id: "sample-grid",
                        data: highlightedFence,
                        zIncreaseDownwards,
                        highlightNode: { traceIndex: highlight.traceIndex, sampleIndex: highlight.sampleIndex },
                    }),
                ),
            );
        }

        return layers;
    }

    private calcBoundingBox(): BoundingBox3D {
        const { data: sections, zIncreaseDownwards } = this.props;

        let xmin = Number.POSITIVE_INFINITY;
        let ymin = Number.POSITIVE_INFINITY;
        let zmin = Number.POSITIVE_INFINITY;
        let xmax = Number.NEGATIVE_INFINITY;
        let ymax = Number.NEGATIVE_INFINITY;
        let zmax = Number.NEGATIVE_INFINITY;

        const zSign = zIncreaseDownwards ? -1 : 1;

        for (const section of sections) {
            if (!section.fence || !section.fence.traceXYZPointsArray) {
                if (section.loadingGeometry) {
                    // If the fence is not loaded, we can use the loading geometry to calculate the bounding box.
                    const { boundingBox } = section.loadingGeometry;
                    xmin = Math.min(xmin, boundingBox.min.x);
                    ymin = Math.min(ymin, boundingBox.min.y);
                    zmin = Math.min(zmin, boundingBox.min.z * zSign);
                    xmax = Math.max(xmax, boundingBox.max.x);
                    ymax = Math.max(ymax, boundingBox.max.y);
                    zmax = Math.max(zmax, boundingBox.max.z * zSign);
                }
                continue;
            }
            const { traceXYZPointsArray } = section.fence;

            for (let i = 0; i < traceXYZPointsArray.length; i += 3) {
                const sectionXMin = traceXYZPointsArray[i];
                const sectionXMax = sectionXMin + section.fence.vVector[0];
                const sectionYMin = traceXYZPointsArray[i + 1];
                const sectionYMax = traceXYZPointsArray[i + 1] + section.fence.vVector[1];
                const sectionZMin = zSign * traceXYZPointsArray[i + 2];
                const sectionZMax = zSign * traceXYZPointsArray[i + 2] + section.fence.vVector[2];
                xmin = Math.min(xmin, sectionXMin, sectionXMax);
                ymin = Math.min(ymin, sectionYMin, sectionYMax);
                zmin = Math.min(zmin, sectionZMin, sectionZMax);
                xmax = Math.max(xmax, sectionXMin, sectionXMax);
                ymax = Math.max(ymax, sectionYMin, sectionYMax);
                zmax = Math.max(zmax, sectionZMin, sectionZMax);
            }
        }

        return [xmin, ymin, zmin, xmax, ymax, zmax];
    }
}
