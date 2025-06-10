import { SimpleMeshLayer } from "@deck.gl/mesh-layers";
import { Model } from "@luma.gl/engine";

import fs from "./shaders/fragmentShader.glsl";
import vs from "./shaders/vertexShader.glsl";
export class ExtendedSimpleMeshLayer extends SimpleMeshLayer {
    static layerName = "ExtendedSimpleMeshLayer";

    initializeState(): void {
        super.initializeState();
        const attributeManager = this.getAttributeManager()!;
        // Removing this as we are not interested in instance picking colors (we have no instances).
        // Otherwise, it will be added to the attribute manager and will be used in the shader occupying space
        // in the fragment color output which we want to use for our own picking color.

        attributeManager.remove(["instancePickingColors"]);
    }

    protected getModel(mesh: any): Model {
        const model = new Model(this.context.device, {
            ...this.getShaders(),
            id: this.props.id,
            bufferLayout: this.getAttributeManager()!.getBufferLayouts(),
            geometry: mesh,
            isInstanced: false,
        });

        const { texture } = this.props;
        const { emptyTexture } = this.state;
        const simpleMeshProps: any = {
            sampler: (texture as any) || emptyTexture,
            hasTexture: Boolean(texture),
        };
        model.shaderInputs.setProps({ simpleMesh: simpleMeshProps });
        return model;
    }

    getShaders() {
        return {
            ...super.getShaders(),
            vs,
            fs,
        };
    }
}
