import type { Texture } from "@luma.gl/core";
import type { ShaderModule } from "@luma.gl/shadertools";

const glslUniformBlock = /* glsl */ `\
uniform animatedCellParticlesUniforms {
    highp int gridTextureSize;
} animatedCellParticles;
`;

export type AnimatedCellParticleUniformProps = {
    gridTextureSize: number;
};

export const animatedCellParticleUniforms = {
    name: "animatedCellParticles",
    vs: glslUniformBlock,
    fs: glslUniformBlock,
    source: "",
    uniformTypes: {
        // ! Luma requires types to be in the exact same order as the uniform block struct code!
        gridTextureSize: "i32",
    },
} as const satisfies ShaderModule<AnimatedCellParticleUniformProps>;
