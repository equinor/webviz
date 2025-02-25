import {
    CompositeLayer,
    CompositeLayerProps,
    FilterContext,
    Layer,
    LayerContext,
    PickingInfo,
    UpdateParameters,
} from "@deck.gl/core";
import { PointCloudLayer } from "@deck.gl/layers";
import { COLORS } from "@lib/utils/colorConstants";
import { ExtendedLayerProps } from "@webviz/subsurface-viewer";
import { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";

import { isEqual } from "lodash";

export type WellborePickLayerData = {
    easting: number;
    northing: number;
    wellBoreUwi: string;
    tvdMsl: number;
    md: number;
    slotName: string;
};

export interface WellBorePicksLayerProps extends ExtendedLayerProps {
    id: string;
    data: WellborePickLayerData[];
    zIncreaseDownwards?: boolean;

    // Non public properties:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
}

// properties.name is required to trigger tooltip in Map.tsx component in subsurface-viewer
type PointsData = { coordinates: [number, number, number]; properties: { name: string } };

export class WellborePicksLayer extends CompositeLayer<WellBorePicksLayerProps> {
    static layerName: string = "WellborePicksLayer";

    // @ts-expect-error - This is how deck.gl expects the state to be defined
    // For instance, see her:
    // https://github.com/visgl/deck.gl/blob/master/modules/layers/src/point-cloud-layer/point-cloud-layer.ts#L123
    state!: {
        pointsData: PointsData[];
        hoveredIndex: number | null;
    };

    initializeState(context: LayerContext): void {
        super.initializeState(context);

        this.state = {
            pointsData: [],
            hoveredIndex: null,
        };
    }

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("text")) {
            return context.viewport.zoom > -4;
        }

        return true;
    }

    private calcBoundingBox(): BoundingBox3D {
        const { data } = this.props;

        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let minZ = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;
        let maxZ = Number.MIN_VALUE;

        for (const wellPick of data) {
            minX = Math.min(minX, wellPick.easting);
            minY = Math.min(minY, wellPick.northing);
            minZ = Math.min(minZ, wellPick.tvdMsl);
            maxX = Math.max(maxX, wellPick.easting);
            maxY = Math.max(maxY, wellPick.northing);
            maxZ = Math.max(maxZ, wellPick.tvdMsl);
        }

        return [minX, minY, minZ, maxX, maxY, maxZ];
    }

    updateState({
        changeFlags,
        props,
        oldProps,
    }: UpdateParameters<Layer<WellBorePicksLayerProps & Required<CompositeLayerProps>>>): void {
        if (!changeFlags.dataChanged) {
            return;
        }

        if (isEqual(props.data, oldProps.data)) {
            return;
        }

        const pointsData: PointsData[] = props.data.map((wellPick) => {
            return {
                coordinates: [wellPick.easting, wellPick.northing, wellPick.tvdMsl],
                properties: {
                    name: `${wellPick.wellBoreUwi}, TVD_MSL: ${wellPick.tvdMsl}, MD: ${wellPick.md}`,
                },
            };
        });

        this.setState({
            pointsData,
        });

        this.props.reportBoundingBox?.({
            layerBoundingBox: this.calcBoundingBox(),
        });
    }

    onHover(info: PickingInfo): boolean {
        const { index } = info;
        this.setState({ hoveredIndex: index });

        return false;
    }

    renderLayers() {
        const { zIncreaseDownwards } = this.props;
        const { pointsData, hoveredIndex } = this.state;

        return [
            new PointCloudLayer({
                id: `${this.props.id}-points`,
                data: pointsData,
                pickable: true,
                getPosition: (d) => {
                    const zFactor = zIncreaseDownwards ? -1 : 1;
                    return [d.coordinates[0], d.coordinates[1], d.coordinates[2] * zFactor];
                },
                getColor: (_, ctx) => {
                    if (ctx.index === hoveredIndex) {
                        return COLORS.hover;
                    }

                    return [100, 100, 100];
                },
                pointSize: 15,
                sizeUnits: "meters",
                material: { ambient: 0.75, diffuse: 0.4, shininess: 0, specularColor: [0, 0, 0] },
                updateTriggers: {
                    getColor: [hoveredIndex],
                    getPosition: [zIncreaseDownwards],
                },
            }),
        ];
    }
}
