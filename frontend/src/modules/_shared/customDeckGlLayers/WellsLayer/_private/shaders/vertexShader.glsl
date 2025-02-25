#version 300 es
#define SHADER_NAME wells-layer-vertex-shader

in vec3 positions;
in vec3 normals;

flat out vec3 normal;
out vec3 cameraPosition;
out vec4 position_commonspace;

void main(void)
{
    cameraPosition = project_uCameraPosition;

    normal = normals;

    position_commonspace = vec4(project_position(positions), 0.0);

    geometry.position = position_commonspace;

    gl_Position = project_common_position_to_clipspace(position_commonspace);
    
    DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

    vec4 color = vec4(0.0);
    DECKGL_FILTER_COLOR(color, geometry);
}