import type { UpdateParameters } from "@deck.gl/core";
import { PathLayer } from "@deck.gl/layers";
import type { ShaderModule } from "@luma.gl/shadertools";

type DashedSectionsPathLayerProps<TData = unknown> = {
    dashArray: [number, number];
    isSegmentDashed: (data: TData, segmentIndex: number) => boolean;
};

const uniformBlock = /*glsl*/ `
    uniform dashSectionUniforms {
        vec2 dashArray;
    } sectionDash;
`;
// TODO: As far as I could understand, this should have been the correct way to implement UBO
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dashSectionUniformModule = {
    name: "sectionDash",
    // vs: uniformBlock,
    fs: uniformBlock,
    uniformTypes: { dashArray: "vec2<f32>" },
    inject: {
        "vs:#decl": /*glsl*/ `
            in float instanceDashFlag;

            out float iDashFlag;
        `,
        "vs:#main-end": /*glsl*/ `
            iDashFlag = instanceDashFlag;
        `,
        "fs:#decl": /*glsl*/ `
            in float iDashFlag;
        `,
        "fs:#main-start": /*glsl*/ `
            float dashLength = sectionDash.dashArray.x + sectionDash.dashArray.y;

            if (dashLength > 0.0 && iDashFlag > 0.0) {
                float segment = mod(vPathPosition.y, dashLength);

                if (segment > sectionDash.dashArray.x) {
                    discard;
                }
            }
        `,
    },
} as const satisfies ShaderModule<Partial<DashedSectionsPathLayerProps>>;

export class DashedSectionsPathLayer<TData = unknown> extends PathLayer<
    TData,
    DashedSectionsPathLayerProps<TData> & Record<string, unknown>
> {
    // TODO: The dashes are only per-segment currently. Should have high-precision since we're dealing with curves
    static layerName = "DashedSectionsPathLayer";
    // Override defaultProps to include getDashArray accessor
    static defaultProps = {
        ...PathLayer.defaultProps,
        dashArray: [0, 0],
        isSegmentDashed: () => 0,
    };

    // Inject custom shaders to support dashed lines
    getShaders() {
        const shaders = super.getShaders();

        // TODO: Migrate to v9 UBO uniforms
        // return {
        //     ...shaders,
        //     modules: [...shaders.modules, dashSectionUniformModule],
        // };

        return {
            ...shaders,
            inject: {
                "vs:#decl": /*glsl*/ `
                    in float instanceDashFlag;

                    out float iDashFlag;
                `,
                "vs:#main-end": /*glsl*/ `
                    iDashFlag = instanceDashFlag;
                `,
                "fs:#decl": /*glsl*/ `
                    in float iDashFlag;
                    uniform vec2 dashArray;
                `,

                "fs:#main-start": /*glsl*/ `
                    float dashLength = dashArray.x + dashArray.y;

                    if (dashLength > 0.0 && iDashFlag > 0.0) {
                        float segment = mod(vPathPosition.y, dashLength);

                        if (segment > dashArray.x) {
                            discard;
                        }
                    }

                `,
            },
        };
    }

    // Extend the initializeState method to add the dash array attribute
    initializeState() {
        super.initializeState();
        this.getAttributeManager()?.addInstanced({
            instanceDashFlag: {
                size: 1,
                accessor: "getPath",
                update: (attribute, ctx) => {
                    let i = 0;

                    // for (const object of this.props.data) {
                    for (const object of ctx.data) {
                        const path = ctx.props.getPath(object);

                        for (let segmentIndex = 0; segmentIndex < path.length; segmentIndex++) {
                            const segmentIsDashed = this.props.isSegmentDashed(object, segmentIndex);

                            attribute.value![i++] = segmentIsDashed ? 1 : 0;
                        }
                    }
                },
            },
        });

        // TODO: Use this for the migrated uniform flow
        // this.setShaderModuleProps({
        //     sectionDash: {
        //         dashArray: [...this.props.dashArray],
        //     },
        // });
    }

    // updateState(params: UpdateParameters<this>): void {}

    updateState(params: UpdateParameters<this>) {
        super.updateState(params);

        const { dashArray } = params.props;
        for (const model of this.getModels()) {
            // TODO: Migrate to UBO, but I cannot for the life of me make it work...
            model.setUniforms({
                ...model.uniforms,
                dashArray,
            });
        }
    }
}
