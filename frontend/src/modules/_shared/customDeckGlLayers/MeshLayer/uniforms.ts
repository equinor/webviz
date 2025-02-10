import type { ShaderModule } from "@luma.gl/shadertools";

const uniformBlock = `\
uniform simpleMeshUniforms {
  float sizeScale;
  bool flatShading;
} simpleMesh;
`;

export type SimpleMeshProps = {
    sizeScale?: number;
    flatShading?: boolean;
};

export const simpleMeshUniforms = {
    name: "simpleMesh",
    vs: uniformBlock,
    fs: uniformBlock,
    uniformTypes: {
        sizeScale: "f32",
        flatShading: "f32",
    },
} as const satisfies ShaderModule<SimpleMeshProps>;
