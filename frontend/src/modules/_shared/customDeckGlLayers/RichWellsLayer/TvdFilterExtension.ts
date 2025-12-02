import type { Accessor, CompositeLayer, Layer, LayerContext, UpdateParameters } from "@deck.gl/core";
import { LayerExtension } from "@deck.gl/core";
import { sum } from "lodash";

// Declare uniform block & custom shader module
const uniformBlock = `\
uniform highlightUniforms {
    bool enabled;
  } highlight;
  `;

const highlightUniforms = {
    name: "trips",
    fs: uniformBlock, // Only need to add block to fragment stage in this example
    uniformTypes: { enabled: "f32" },
};
// as const satisfies ShaderModule<TripsProps>;

const tvdFilterUniformBlock = /*glsl*/ `
    uniform tvdFilterUniforms {
        bool discardFiltered;
        float min;
        float max;
    }
`;

// ... Can'
// type TvdFilterExtensionOptions = {};
export type TvdFilterExtensionProps<TData = any> = {
    getTvd: Accessor<TData, number[] | number>;
    tvdRange?: [number | undefined, number | undefined];
};

export class TvdFilterExtension extends LayerExtension {
    static extensionName = "TvdFilterExtension";
    static defaultProps = {};

    initializeState(this: Layer<TvdFilterExtensionProps>, context: LayerContext, extension: this): void {
        super.initializeState(context, extension);

        const attributeManager = this.getAttributeManager();

        attributeManager?.addInstanced({
            // This is arguably just the z coordinate, but we let layers define it more explicitly (for instance, a well marker object will only have a single tvd value)
            tvd: { size: 1, accessor: "getTvd" },
        });
    }

    getShaders() {
        return {
            inject: {
                "vs:#decl": /*glsl*/ `
                    in float tvd;
                    uniform float tvdMin;
                    uniform float tvdMax;

                    out float tvd_is_filtered;
                `,
                "vs:DECKGL_FILTER_COLOR": /*glsl*/ `
                    if(tvd < tvdMin || tvd > tvdMax) {
                        tvd_is_filtered = 1.0;
                    }

                `,
                "fs:#decl": /*glsl*/ `
                    uniform bool highlightRed;
                    uniform float redThreshold;
                    uniform float tvdFilter;

                    in float tvd_is_filtered;

                `,
                "fs:DECKGL_FILTER_COLOR": /*glsl*/ `
                    if (tvd_is_filtered > 0.0) {
                        color.a *= 0.3;
                    }
                `,
            },
        };
    }

    updateState(
        this: Layer<TvdFilterExtensionProps>,
        params: UpdateParameters<Layer<TvdFilterExtensionProps>>,
        extension: this,
    ) {
        super.updateState(params, extension);

        const { tvdRange } = params.props;
        for (const model of this.getModels()) {
            // TODO: Migrate
            model.setUniforms({
                tvdMin: tvdRange?.[0] ?? Number.NEGATIVE_INFINITY,
                tvdMax: tvdRange?.[1] ?? Number.POSITIVE_INFINITY,
            });
        }
    }

    getSubLayerProps(this: CompositeLayer<TvdFilterExtensionProps>) {
        const { getTvd, tvdRange } = this.props;
        return { getTvd, tvdRange };
    }
}
