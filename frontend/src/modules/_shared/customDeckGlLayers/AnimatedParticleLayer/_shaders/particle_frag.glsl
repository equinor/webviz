#version 300 es
#define SHADER_NAME animated-particle-fragment-shader

precision highp float;

flat in vec4 vColor;

out vec4 fragColor;

void main() {

    // Calculate distance from the center of the point
    vec2 center = gl_PointCoord - vec2(0.33);
    float distance = length(center);

    // Discard fragments outside the circle
    if (distance > 0.33) {
        discard;
    }



    // TODO: Color should actually be based on a user setting, or similar
    fragColor = vColor;
}