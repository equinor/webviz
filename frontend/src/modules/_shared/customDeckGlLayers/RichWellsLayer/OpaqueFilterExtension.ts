// TODO Extension is not in a workable state at the moment. Leaving it here for brevity

import type { Accessor, CompositeLayer, Layer, LayerContext, UpdateParameters } from "@deck.gl/core";
import { LayerExtension } from "@deck.gl/core";
import type { ShaderModule } from "@luma.gl/shadertools";

const opaqueFilterUniformBlock = /*glsl*/ `
    uniform opaqueFilterUniforms {
        bool discardFiltered;
        float filterMin;
        float filterMax;
    } opaqueFilter;
`;

const opaqueFilterModule = {
    name: "opaqueFilter",
    vs: opaqueFilterUniformBlock,
    fs: opaqueFilterUniformBlock,
    uniformTypes: { discardFiltered: "i32" },
    inject: {
        "vs:#decl": /*glsl*/ `
            in float filterValue;
        `,
        "vs:DECKGL_FILTER_COLOR": /*glsl*/ `
            if(filterValue < opaqueFilter.min || filterValue >= opaqueFilter.max) {
                if (opaqueFilter.discardFiltered) {
                    discard;
                } else {
                    color.a *= 0.3;
                }
            }
        `,
    },
} as const satisfies ShaderModule;

export type TrajectoryFilterExtensionProps<TData = any> = {
    getTvd: Accessor<TData, number[] | number>;
    getMd: Accessor<TData, number[] | undefined>;
    tvdRange?: [number | undefined, number | undefined];
    trajectoryDiscardFiltered?: boolean;
};

export class TvdFilterExtension extends LayerExtension {
    static extensionName = "TvdFilterExtension";
    static defaultProps = {};

    initializeState(this: Layer<TrajectoryFilterExtensionProps>, context: LayerContext, extension: this): void {
        super.initializeState(context, extension);

        const attributeManager = this.getAttributeManager();

        attributeManager?.addInstanced({
            // This is arguably just the z coordinate, but we let layers define it more explicitly (for instance, a well marker object will only have a single tvd value)
            filterValue: { size: 1, accessor: "getFilterValue" },
            // tvd: { size: 1, accessor: "getTvd" },
            // md: { size: 1, accessor: "getMd" },
        });
    }

    getShaders() {
        return {
            modules: [opaqueFilterModule],
        };
    }

    updateState(
        this: Layer<TrajectoryFilterExtensionProps>,
        params: UpdateParameters<Layer<TrajectoryFilterExtensionProps>>,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        extension: this,
    ): void {
        const { getTvd, tvdRange, trajectoryDiscardFiltered: trajectoryDiscardFiltered } = params.props;
        const {
            getTvd: oldGetTvd,
            tvdRange: oldTvdRange,
            trajectoryDiscardFiltered: oldTrajectoryDiscardFiltered,
        } = params.oldProps;

        if (
            trajectoryDiscardFiltered !== oldTrajectoryDiscardFiltered ||
            getTvd !== oldGetTvd ||
            tvdRange !== oldTvdRange
        ) {
            this.setShaderModuleProps({
                opaqueFilter: {
                    discardFiltered: this.props.trajectoryDiscardFiltered ?? false,
                    min: this.props.tvdRange?.[0] ?? Number.NEGATIVE_INFINITY,
                    max: this.props.tvdRange?.[1] ?? Number.POSITIVE_INFINITY,
                },
            });
        }
    }

    getSubLayerProps(this: CompositeLayer<TrajectoryFilterExtensionProps>) {
        const { getTvd, tvdRange, trajectoryDiscardFiltered } = this.props;
        return { getTvd, tvdRange, trajectoryDiscardFiltered };
    }
}
