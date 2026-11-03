#version 300 es
#define SHADER_NAME animated-particle-transform-vertex-shader

uniform highp sampler2DArray uGridVelocityTexture;
uniform highp isampler2DArray uGridNeighborIndexTexture;

in  vec3 oldPositions;
out vec3 newPositions;

in int oldCellIndex;
flat out int newCellIndex;

float randFloat(vec2 seed) {
    return fract(sin(dot(seed.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 gridPosUV = vec2(
        oldCellIndex % animatedCellParticles.gridTextureSize,
        oldCellIndex / animatedCellParticles.gridTextureSize
    );

    // Sample all 6 face velocities
    vec3 velocities[6];
    for (int i = 0; i < 6; i++) {
        velocities[i] = texelFetch(uGridVelocityTexture, ivec3(gridPosUV, i), 0).xyz;
    }

    int neighbors[6];
    for (int i = 0; i < 2; i++) {
        ivec4 neighborIndices = texelFetch(uGridNeighborIndexTexture, ivec3(gridPosUV, i), 0);
        neighbors[i + 0] = neighborIndices.x;
        neighbors[i + 1] = neighborIndices.y;
        neighbors[i + 2] = neighborIndices.z;
    }

    // Interpolate velocity using barycentric coordinates (u, v, w)
    float u = oldPositions.x;
    float v = oldPositions.y;
    float w = oldPositions.z;
    float one_minus_u = 1.0 - u;
    float one_minus_v = 1.0 - v;
    float one_minus_w = 1.0 - w;

    vec3 interpolatedVelocity = 
        mix(velocities[3], velocities[0], u) +
        mix(velocities[4], velocities[1], v) +
        mix(velocities[5], velocities[2], w);

    newPositions = oldPositions + interpolatedVelocity * animatedCellParticles.deltaTime;
    // newPositions = oldPositions + interpolatedVelocity * 0.016;

    newCellIndex = oldCellIndex;

    // Check if coordinates are out of bounds and update cell index
    // Technically, I guess a particle could cross diagonally; we'll ignore that case as one or two particles "jumping" is barely noticeable
    if(newPositions.x < 0.0) {
        newCellIndex = neighbors[3];
        newPositions.x = newPositions.x + 1.0;
    }

    else if(newPositions.x >= 1.0) {
        newCellIndex = neighbors[0];
        newPositions.x = newPositions.x - 1.0;
    }

    else if(newPositions.y < 0.0) {
        newCellIndex = neighbors[4];
        newPositions.y = newPositions.y + 1.0;
    }
    
    else if(newPositions.y >= 1.0) {
        newCellIndex = neighbors[1];
        newPositions.y = newPositions.y - 1.0;
    }
    
    else if(newPositions.z < 0.0) {
        newCellIndex = neighbors[5];
        newPositions.z = newPositions.z + 1.0;
    }
    else if(newPositions.z >= 1.0) {
        newCellIndex = neighbors[2];
        newPositions.z = newPositions.z - 1.0;
    }

    // TODO: This randomization has bad distribution
    if(newCellIndex == -1) {
        float seed = newPositions.x + newPositions.y + newPositions.x;
        float r = randFloat(vec2(float(gl_InstanceID), float(gl_InstanceID)));

        newCellIndex = int(floor(r * float(animatedCellParticles.maxCellIndex + uint(1))));
        newPositions = vec3(randFloat(vec2(seed, float(gl_InstanceID))), randFloat(vec2(seed + 1.0, float(gl_InstanceID))), randFloat(vec2(seed + 2.0, float(gl_InstanceID))));
    }
}