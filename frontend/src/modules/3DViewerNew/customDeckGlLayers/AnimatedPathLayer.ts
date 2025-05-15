import type { UpdateParameters } from "@deck.gl/core";
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
        const inject = shaders.inject ?? {};
        const injectDecl = inject["vs:#decl"] ?? "";
        const injectMainEnd = inject["vs:#main-end"] ?? "";
        return {
            ...shaders,
            inject: {
                ...inject,
                "vs:#decl":
                    injectDecl ??
                    "" +
                        `\
        uniform float dashStart;`,
                "vs:#main-end":
                    injectMainEnd ??
                    "" +
                        `\
        vDashOffset += dashStart;`,
            },
        };
    }

    draw({ uniforms }: Record<string, any>) {
        super.draw({ uniforms: { ...uniforms, dashStart: this._dashStart } });
    }
}
