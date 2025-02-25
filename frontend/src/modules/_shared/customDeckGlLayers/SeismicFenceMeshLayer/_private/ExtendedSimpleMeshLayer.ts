import { SimpleMeshLayer } from "@deck.gl/mesh-layers";

export class ExtendedSimpleMeshLayer extends SimpleMeshLayer {
    static name = "ExtendedSimpleMeshLayer";
    static componentName = "ExtendedSimpleMeshLayer";

    getShaders() {
        return {
            ...super.getShaders(),
            inject: {
                "vs:#decl": `
    flat out int vertexIndex;`,
                "vs:#main-end": `
    vertexIndex = gl_VertexID;`,
                "fs:#decl": `
    flat in int vertexIndex;
    
    vec4 encodeVertexIndexToRGB (int vertexIndex) {
        float r = 0.0;
        float g = 0.0;
        float b = 0.0;
    
        if (vertexIndex >= (256 * 256) - 1) {
        r = floor(float(vertexIndex) / (256.0 * 256.0));
        vertexIndex -= int(r * (256.0 * 256.0));
        }
    
        if (vertexIndex >= 256 - 1) {
        g = floor(float(vertexIndex) / 256.0);
        vertexIndex -= int(g * 256.0);
        }
    
        b = float(vertexIndex);
    
        return vec4(r / 255.0, g / 255.0, b / 255.0, 1.0);   
    }
    `,
                "fs:#main-start": `
    if (picking.isActive > 0.5 && !(picking.isAttribute > 0.5)) {
        fragColor = encodeVertexIndexToRGB(vertexIndex);
        return;
    }`,
            },
        };
    }
}
