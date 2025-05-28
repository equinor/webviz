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
              in vec3 pickingColors;
              out vec3 vPickingColor;
            `,
                "vs:#main-end": `
              vPickingColor = pickingColors;
            `,
                "fs:#decl": `
              in vec3 vPickingColor;
            `,
                "fs:#main-start": `
              if (picking.isActive > 0.5 && !(picking.isAttribute > 0.5)) {
                fragColor = vec4(vPickingColor / 255.0, 1.0);
                return;
              }
            `,
            },
        };
    }
}
