import { Layer, OrbitView, OrthographicView, project32 } from "@deck.gl/core";
import type { LayerContext } from "@deck.gl/core";
import { DeckGL } from "@deck.gl/react";
import type { Buffer } from "@luma.gl/core";
import { Model } from "@luma.gl/engine";
import type { Meta, StoryObj } from "@storybook/react";

// The vertex shader has no inputs: the single point is created at (0, 0, 0) in the shader itself
const vertexShader = /*glsl*/ `\
#version 300 es
#define SHADER_NAME shader-point-vertex-shader

precision highp float;

in vec3 instancePosition;

void main(void) {
    gl_Position = project_position_to_clipspace(instancePosition, vec3(0.0), vec3(0.0));
    // gl_Position = project_position_to_clipspace(vec3(0.0), vec3(0.0), vec3(0.0));

    gl_PointSize = 20.0;
}
`;

const fragmentShader = /*glsl*/ `\
#version 300 es
#define SHADER_NAME shader-point-fragment-shader

precision highp float;

out vec4 fragColor;

void main(void) {
    fragColor = vec4(0.0, 1.0, 0.0, 1.0);
}
`;

const INSTANCE_COUNT = 8;

export class ShaderPointLayer extends Layer {
    static layerName: string = "ShaderPointLayer";

    // @ts-expect-error - This is how deck.gl expects the state to be defined
    state!: {
        model: Model;
        positionBuffer: Buffer;
    };

    initializeState(context: LayerContext): void {
        // this.getAttributeManager()?.addInstanced({});

        // prettier-ignore
        // const positionBuffer = context.device.createBuffer(new Float32Array([
        //     -5.0, -5.0, -5.0, // point 1
        //      5.0, -5.0, -5.0, // point 2
        //     -5.0,  5.0, -5.0, // point 3
        //      5.0,  5.0, -5.0, // point 4
        //     -5.0, -5.0,  5.0, // point 5
        //      5.0, -5.0,  5.0, // point 6
        //     -5.0,  5.0,  5.0, // point 7
        //      5.0,  5.0,  5.0, // point 8
        // ]));

        const posData = new Float32Array([
            -5.0, -5.0, -5.0, // point 1
             5.0, -5.0, -5.0, // point 2
            -5.0,  5.0, -5.0, // point 3
             5.0,  5.0, -5.0, // point 4
            -5.0, -5.0,  5.0, // point 5
             5.0, -5.0,  5.0, // point 6
            -5.0,  5.0,  5.0, // point 7
             5.0,  5.0,  5.0, // point 8
        ])

        const positionBuffer = context.device.createBuffer(posData);

        // Add the instanced attribute through deck.gl's AttributeManager
        // this.getAttributeManager()?.addInstanced({
        //     instancePosition: {
        //         size: 3,
        //         // accessor: "getPosition",
        //         defaultValue: [0, 5, 0],
        //         update: (attribute) => attribute.setData({ value: posData }),
        //     },
        // });

        this.setState({
            numInstances: INSTANCE_COUNT,
            positionBuffer: positionBuffer,
            model: new Model(context.device, {
                id: `${this.id}-model`,
                vs: vertexShader,
                fs: fragmentShader,
                modules: [project32],
                topology: "point-list",
                vertexCount: 1,
                isInstanced: true,
                attributes: { instancePosition: positionBuffer },
                bufferLayout: [{ name: "instancePosition", format: "float32x3", stepMode: "instance" }],
            }),
        });
    }

    draw(): void {
        this.state.model.setAttributes({ instancePosition: this.state.positionBuffer });
        this.state.model.draw(this.context.renderPass);
    }
}

function ShaderPoint(): React.ReactNode {
    return (
        <div style={{ position: "relative", width: 400, height: 400, background: "#eee" }}>
            <DeckGL
                views={new OrthographicView({ id: "ortho" })}
                initialViewState={{ target: [0, 0, 0], zoom: -2 }}
                controller
                layers={[new ShaderPointLayer({ id: "shader-point" })]}
            />
        </div>
    );
}

const meta: Meta<typeof ShaderPoint> = {
    title: "CustomDeckGlLayers/ShaderPoint",
    component: ShaderPoint,
    parameters: {
        layout: "centered",
    },
};

export default meta;
type Story = StoryObj<typeof ShaderPoint>;

export const Default: Story = {};
