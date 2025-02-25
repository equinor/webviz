#version 300 es
#define SHADER_NAME wells-layer-fragment-shader

precision highp float;

in vec3 cameraPosition;
in vec4 position_commonspace;
flat in vec3 normal;

out vec4 fragColor;

void main(void) {
    vec4 color = vec4(0.85f, 0.85f, 0.85f, 1.0f);

    geometry.uv = vec2(0.);
    
    DECKGL_FILTER_COLOR(color, geometry);
    vec3 lightColor = lighting_getLightColor(color.rgb, cameraPosition, position_commonspace.xyz, normal);
    fragColor = vec4(lightColor, color.a);
}