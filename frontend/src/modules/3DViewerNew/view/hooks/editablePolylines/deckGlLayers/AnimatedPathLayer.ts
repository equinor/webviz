import { UpdateParameters } from "@deck.gl/core";
import { PathLayer } from "@deck.gl/layers";

export class AnimatedPathLayer extends PathLayer {
    static layerName = "AnimatedPathLayer";

    private _dashStart: number = 0;
    private _requestId: ReturnType<typeof requestAnimationFrame> | null = null;

    initializeState() {
        super.initializeState();
        this.animate();
    }

    updateState(params: UpdateParameters<this>): void {
        super.updateState(params);
        if (this._requestId) {
            cancelAnimationFrame(this._requestId);
        }
        this.animate();
    }

    private animate() {
        this._dashStart = (Date.now() / 50) % 1000;

        this.setNeedsRedraw();
        this._requestId = requestAnimationFrame(() => this.animate());
    }

    getShaders() {
        const shaders = super.getShaders();
        return {
            ...shaders,
            inject: {
                ...shaders.inject,
                "vs:#decl":
                    shaders.inject["vs:#decl"] +
                    `\
        uniform float dashStart;`,
                "vs:#main-end":
                    shaders.inject["vs:#main-end"] +
                    `\
        vDashOffset += dashStart;`,
            },
        };
    }

    draw({ uniforms }: Record<string, any>) {
        super.draw({ uniforms: { ...uniforms, dashStart: this._dashStart } });
    }
}
