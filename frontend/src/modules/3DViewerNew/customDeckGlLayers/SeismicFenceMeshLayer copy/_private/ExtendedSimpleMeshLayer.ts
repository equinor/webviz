import { SimpleMeshLayer } from "@deck.gl/mesh-layers";

export class ExtendedSimpleMeshLayer extends SimpleMeshLayer {
    static layerName = "ExtendedSimpleMeshLayer";

    getShaders() {
        return {
            ...super.getShaders(),
            inject: {
                "vs:#decl": `
    out float vVertexIndex;`,
                "vs:#main-end": `
    vVertexIndex = float(gl_VertexID);`,
                "fs:#decl": `
    in float vVertexIndex;
    
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
        fragColor = encodeVertexIndexToRGB(int(vVertexIndex));
        return;
    }`,
            },
        };
    }
}
