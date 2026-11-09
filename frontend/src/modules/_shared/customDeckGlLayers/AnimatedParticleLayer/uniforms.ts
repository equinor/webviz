import type { ShaderModule } from "@luma.gl/shadertools";

const glslUniformBlock = /* glsl */ `\
uniform animatedCellParticlesUniforms {
    highp int gridTextureSize;
    highp uint maxCellIndex;
    float deltaTime;
    float maxAge;
    float size;
    float velocityScale;
} animatedCellParticles;
`;

export type AnimatedCellParticleUniformProps = {
    gridTextureSize: number;
    maxCellIndex: number;
    deltaTime: number;
    maxAge: number;
    size: number;
    velocityScale: number;
};

export const animatedCellParticleUniforms = {
    name: "animatedCellParticles",
    vs: glslUniformBlock,
    fs: glslUniformBlock,
    source: "",
    uniformTypes: {
        // ! Luma requires types to be in the exact same order as the uniform block struct code!
        gridTextureSize: "i32",
        maxCellIndex: "u32",
        deltaTime: "f32",
        maxAge: "f32",
        size: "f32",
        velocityScale: "f32",
    },
} as const satisfies ShaderModule<AnimatedCellParticleUniformProps>;
