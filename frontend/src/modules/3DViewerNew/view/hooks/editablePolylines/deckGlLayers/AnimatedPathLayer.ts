import { UpdateParameters } from "@deck.gl/core";
import { PathLayer } from "@deck.gl/layers";

export class AnimatedPathLayer extends PathLayer {
    static layerName = "AnimatedPathLayer";

    private _dashStart: number = 0;

    initializeState() {
        super.initializeState();
        this.animate();
    }

    updateState(params: UpdateParameters<this>): void {
        super.updateState(params);
        this.animate();
    }

    private animate() {
        this._dashStart = (Date.now() / 50) % 1000;

        this.setNeedsRedraw();
        requestAnimationFrame(() => this.animate());
    }

    getShaders() {
        const shaders = super.getShaders();
        shaders.inject["vs:#decl"] += `\
      uniform float dashStart;`;
        shaders.inject["vs:#main-end"] += `\
      vDashOffset += dashStart;`;
        return shaders;
    }

    draw({ uniforms }: Record<string, any>) {
        uniforms.dashStart = this._dashStart || 0;
        super.draw({ uniforms });
    }
}
