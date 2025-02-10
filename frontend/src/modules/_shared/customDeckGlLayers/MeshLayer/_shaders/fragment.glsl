#version 300 es
#define SHADER_NAME mesh-layer-fs

precision highp float;

in vec3 cameraPosition;
in vec3 normals_commonspace;
in vec4 position_commonspace;
in vec4 vColor;
flat in int vertexIndex;

out vec4 fragColor;

void main(void) {
  vec3 normal;

  if (simpleMesh.flatShading) {
    normal = normalize(cross(dFdx(position_commonspace.xyz), dFdy(position_commonspace.xyz)));
  } else {
    normal = normals_commonspace;
  }

  // Picking pass
  if (picking.isActive > 0.5 && !(picking.isAttribute > 0.5)) {
    fragColor = encodeVertexIndexToRGB(vertexIndex);
    return;
  }

  vec4 color = vec4(vColor.rgb, 1.0);

  DECKGL_FILTER_COLOR(color, geometry);

  vec3 lightColor = lighting_getLightColor(color.rgb, cameraPosition, position_commonspace.xyz, normal);
  fragColor = vec4(lightColor, 1.0);
}