import { SimpleMeshLayer } from "@deck.gl/mesh-layers";

export class ExtendedSimpleMeshLayer extends SimpleMeshLayer {
    static layerName = "ExtendedSimpleMeshLayer";

    initializeState(): void {
        super.initializeState();
        // Removing this as we are not interested in instance picking colors (we have no instances).
        // Otherwise, it will be added to the attribute manager and will be used in the shader occupying space
        // in the fragment color output which we want to use for our own picking color.
        this.getAttributeManager()?.remove(["instancePickingColors"]);
    }

    getShaders() {
        return {
            ...super.getShaders(),
            inject: {
                "vs:#decl": `
                out float vCustomVertexIndex;`,
                "vs:#main-end": `
                vCustomVertexIndex = float(gl_VertexID);`,
                "fs:#decl": `
                in float vCustomVertexIndex;
    
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
                    fragColor = encodeVertexIndexToRGB(int(vCustomVertexIndex));
                    return;
                }`,
            },
        };
    }
}
