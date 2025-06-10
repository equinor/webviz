import { CompositeLayer, type Color } from "@deck.gl/core";
import { PathStyleExtension, type PathStyleExtensionProps } from "@deck.gl/extensions";
import { PathLayer, type PathLayerProps } from "@deck.gl/layers";

type AnimatedPathLayerProps = PathLayerProps<any> & PathStyleExtensionProps<any>;

export class AnimatedPathLayer extends CompositeLayer<AnimatedPathLayerProps> {
    static layerName = "AnimatedPathCompositeLayer";

    // @ts-expect-error - this is how deck.gl defines state
    state!: {
        dashOffset: number;
    };

    private _animationFrame: number | null = null;

    initializeState() {
        this.state = { dashOffset: 0 };
        this._startAnimation();
    }

    finalizeState() {
        this._stopAnimation();
    }

    private _startAnimation() {
        const animate = () => {
            this.setState({ dashOffset: (Date.now() / 10) % 1000 });
            this.setNeedsUpdate();
            this._animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    private _stopAnimation() {
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }
    }

    renderLayers() {
        const { data, getPath, getColor = () => [255, 0, 0] as Color, getWidth = () => 5 } = this.props;
        const { dashOffset } = this.state;

        return new PathLayer({
            id: `${this.id}-path`,
            data,
            getPath,
            getColor,
            getWidth,
            getDashArray: () => {
                const base = 10;
                const gap = 5;

                const phase = (Math.sin(dashOffset / 100) + 1) / 2; // 0 to 1
                const scale = 0.5 + 0.5 * phase; // avoid 0

                return [base * scale, gap * scale];
            },
            billboard: true,
            widthUnits: "meters",
            widthMinPixels: 3,
            widthMaxPixels: 10,
            extensions: [new PathStyleExtension({ highPrecisionDash: true, dash: true, offset: true })],
            updateTriggers: {
                getDashArray: { dashOffset },
            },
            parameters: {
                depthTest: false,
            },
        });
    }
}
