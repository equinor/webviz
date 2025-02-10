#version 300 es
#define SHADER_NAME mesh-layer-vs

// Primitive attributes
in vec3 positions;
in vec3 normals;
in vec3 colors;

// Instance attributes
in vec3 instancePositions;
in vec3 instancePositions64Low;
in vec3 instanceTranslation;

// Outputs to fragment shader
out vec3 cameraPosition;
out vec3 normals_commonspace;
out vec4 position_commonspace;
out vec4 vColor;
flat out int vertexIndex;


void main(void) {
  geometry.worldPosition = instancePositions;
  geometry.pickingColor = vec3(1.0, 1.0, 0.0);

  vertexIndex = gl_VertexID;

  cameraPosition = project.cameraPosition;

  vColor = vec4(colors.rgb, 1.0);

  vec3 pos = positions * simpleMesh.sizeScale + instanceTranslation;

  pos = project_size(pos);
  DECKGL_FILTER_SIZE(pos, geometry);
  gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, pos, position_commonspace);
  geometry.position = position_commonspace;
  normals_commonspace = project_normal(normals);

  geometry.normal = normals_commonspace;
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

  DECKGL_FILTER_COLOR(vColor, geometry);
}