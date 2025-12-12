// TODO Extension is not in a workable state at the moment. Leaving it here for brevity

import type { Accessor, CompositeLayer, Layer, LayerContext, UpdateParameters } from "@deck.gl/core";
import { LayerExtension } from "@deck.gl/core";
import type { ShaderModule } from "@luma.gl/shadertools";

// Declare uniform block & custom shader module
// const uniformBlock = `\
// uniform highlightUniforms {
//     bool enabled;
//   } highlight;
//   `;

// const highlightUniforms = {
//     name: "trips",
//     fs: uniformBlock, // Only need to add block to fragment stage in this example
//     uniformTypes: { enabled: "f32" },
// };
// as const satisfies ShaderModule<TripsProps>;

const tvdFilterUniformBlock = /*glsl*/ `
    uniform tvdFilterUniforms {
        bool discardFiltered;
        float min;
        float max;
        mat4x2 mdRanges;
    } tvdFilter;
`;

const tvdFilterModule = {
    name: "tvdFilter",
    vs: tvdFilterUniformBlock,
    fs: tvdFilterUniformBlock,
    uniformTypes: {
        discardFiltered: "i32",
        min: "f32",
        max: "f32",
        // Allows four ranges as [from1, to1, from2, to2, ...etc]
        mdRanges: "mat4x2<f32>",
    },
    inject: {
        "vs:#decl": /*glsl*/ `
            in float tvd;
            in float md;
            out float v_tvd;
            out float v_md;
        `,
        "vs:#main-end": /*glsl*/ `
            v_tvd = tvd;
            v_md = md;
        `,
        "fs:#decl": /*glsl*/ `
            in float v_tvd;
            in float v_md;
        `,
        "fs:DECKGL_FILTER_COLOR": /*glsl*/ `
            if(!(
                (v_tvd >= tvdFilter.min && v_tvd < tvdFilter.max)
                // (v_md >= tvdFilter.mdRanges[0][0] && v_md < tvdFilter.mdRanges[0][1])
                // ||(v_md >= tvdFilter.mdRanges[1][0] && v_md < tvdFilter.mdRanges[1][1])
                // ||(v_md >= tvdFilter.mdRanges[2][0] && v_md < tvdFilter.mdRanges[2][1])
                // ||(v_md >= tvdFilter.mdRanges[3][0] && v_md < tvdFilter.mdRanges[3][1])

                // && (v_md < tvdFilter.mdRanges[1][0] || v_md >= tvdFilter.mdRanges[1][1])
                // && v_md < tvdFilter.mdRanges[0][2] && v_md >= tvdFilter.mdRanges[1][2]
                // && v_md < tvdFilter.mdRanges[0][3] && v_md >= tvdFilter.mdRanges[1][3]
            )
            ) {
                if (tvdFilter.discardFiltered) {
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
            tvd: { size: 1, accessor: "getTvd" },
            md: { size: 1, accessor: "getMd" },
        });
    }

    getShaders() {
        return {
            modules: [tvdFilterModule],
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
                tvdFilter: {
                    discardFiltered: this.props.trajectoryDiscardFiltered ?? false,
                    min: this.props.tvdRange?.[0] ?? Number.NEGATIVE_INFINITY,
                    max: this.props.tvdRange?.[1] ?? Number.POSITIVE_INFINITY,
                    // mdRanges: this.props.ndrage,
                },
            });
        }
    }

    getSubLayerProps(this: CompositeLayer<TrajectoryFilterExtensionProps>) {
        const { getTvd, tvdRange, trajectoryDiscardFiltered } = this.props;
        return { getTvd, tvdRange, trajectoryDiscardFiltered };
    }
}
