#version 300 es
#define SHADER_NAME animated-particle-vertex-shader

precision highp float;

in float instanceAge;
flat out vec4 vColor;

in vec3 instancePositions;
in int instanceCellIndex;

// flat out vec3 DEB_particle_color;

uniform highp sampler2DArray uGridPositionsTexture;

void main() {
    vec3 posLow = vec3(0.0, 0.0, 0.0);

    geometry.worldPosition = instancePositions;

    vec2 gridPosUV = vec2(
        instanceCellIndex % animatedCellParticles.gridTextureSize,
        instanceCellIndex / animatedCellParticles.gridTextureSize
    );

    // Fetch all 8 corners
    vec4 corners[8];
    for (int i = 0; i < 8; i++) {
        corners[i] = texelFetch(uGridPositionsTexture, ivec3(gridPosUV, i), 0);
    }

    // Interpolate position using instancePositions as barycentric coordinates (u, v, w)
    float u = instancePositions.x;
    float v = instancePositions.y;
    float w = instancePositions.z;
    float one_minus_u = 1.0 - u;
    float one_minus_v = 1.0 - v;
    float one_minus_w = 1.0 - w;

    vec3 interpolatedPos = 
        corners[0].xyz * (one_minus_u * one_minus_v * one_minus_w) +
        corners[1].xyz * (u * one_minus_v * one_minus_w) +
        corners[2].xyz * (one_minus_u * v * one_minus_w) +
        corners[3].xyz * (u * v * one_minus_w) +
        corners[4].xyz * (one_minus_u * one_minus_v * w) +
        corners[5].xyz * (u * one_minus_v * w) +
        corners[6].xyz * (one_minus_u * v * w) +
        corners[7].xyz * (u * v * w);

    gl_Position = project_position_to_clipspace(interpolatedPos, posLow, vec3(0.0), geometry.position);
    // gl_PointSize = max(project_size_to_pixel(animatedCellParticles.size), 3.0);
    // gl_PointSize = project_size_to_pixel(animatedCellParticles.size);
    // gl_PointSize = animatedCellParticles.size;
    gl_PointSize = animatedCellParticles.size / gl_Position.w;


    DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
    
    vec4 color = vec4(0.0f);
    DECKGL_FILTER_COLOR(color, geometry);
    
    // float alpha = 1.0 - instanceAge / animatedCellParticles.maxAge;
    float alpha = 1.0;
    
    vColor = vec4(1.0, 0.0, 0.0, alpha);

    // Debug colors based on cell index
    // if        (instanceCellIndex == 0) {
    //     vColor = vec4(1.0, 0.0, 0.0, alpha);
    // } else if (instanceCellIndex == 1) {
    //     vColor = vec4(0.0, 1.0, 0.0, alpha);
    // } else if (instanceCellIndex == 2) {
    //     vColor = vec4(0.0, 0.0, 1.0, alpha);
    // } else if (instanceCellIndex == 3) {
    //     vColor = vec4(1.0, 1.0, 0.0, alpha);
    // } else if (instanceCellIndex == 4) {
    //     vColor = vec4(1.0, 0.0, 1.0, alpha);
    // } else if (instanceCellIndex == 5) {
    //     vColor = vec4(0.0, 1.0, 1.0, alpha);
    // } else if (instanceCellIndex == 6) {
    //     vColor = vec4(0.0, 0.0, 0.0, alpha);
    // } else if (instanceCellIndex == 7) {
    //     vColor = vec4(0.5, 0.5, 0.5, alpha);
    // }
}