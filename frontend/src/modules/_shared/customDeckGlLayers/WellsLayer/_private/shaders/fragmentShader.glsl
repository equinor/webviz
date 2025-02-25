#version 300 es
#define SHADER_NAME wells-layer-fragment-shader

precision highp float;

in vec3 cameraPosition;
in vec4 position_commonspace;
flat in vec3 normal;
in float pointingTowardsCamera;

out vec4 fragColor;

vec4 encodeVertexAndPipeIndexToRGB(float pipeIndex) {
    int index = int(pipeIndex);
    float r = 0.0f;
    float g = 0.0f;
    float b = 0.0f;

    if(index >= (256 * 256) - 1) {
        r = floor(float(index) / (256.0f * 256.0f));
        index -= int(r * (256.0f * 256.0f));
    }

    if(index >= 256 - 1) {
        g = floor(float(index) / 256.0f);
        index -= int(g * 256.0f);
    }

    b = float(index);

    return vec4(r / 255.0f, g / 255.0f, b / 255.0f, 1.0f);
}

void main(void) {
    if(picking.isActive > 0.5f && !(picking.isAttribute > 0.5f)) {
        float pipeIndex = pipe.pipeIndex;
        fragColor = encodeVertexAndPipeIndexToRGB(pipeIndex);
        return;
    }

    vec4 color = vec4(0.85f, 0.85f, 0.85f, 1.0f);

    if(pipe.isHovered) {
        color = vec4(0.42f, 0.47f, 0.88f, 1.0f);
        /*
        This could be a nice effect, but it's not used in the current implementation
        if(pointingTowardsCamera > 0.0f) {
            color.a = 0.2f;
        }
        */
    }

    geometry.uv = vec2(0.f);

    DECKGL_FILTER_COLOR(color, geometry);
    vec3 lightColor = lighting_getLightColor(color.rgb, cameraPosition, position_commonspace.xyz, normal);
    fragColor = vec4(lightColor, color.a);
}