import type { ShaderModule } from "@luma.gl/shadertools";

const uniformBlock = `\
uniform pipeUniforms {
    float pipeIndex;
    bool isHovered;
} pipe;
 `;

export type PipeProps = {
    pipeIndex?: number;
    isHovered?: boolean;
};

export const pipeUniforms = {
    name: "pipe",
    vs: uniformBlock,
    fs: uniformBlock,
    uniformTypes: {
        pipeIndex: "f32",
        isHovered: "f32",
    },
} as const satisfies ShaderModule<PipeProps>;
