// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

#version 300 es
#define SHADER_NAME simple-mesh-layer-fs

precision highp float;

uniform sampler2D sampler;

in vec2 vTexCoord;
in vec3 cameraPosition;
in vec3 normals_commonspace;
in vec4 position_commonspace;
in vec4 vColor;
in vec3 vPickingColor;

out vec4 fragColor;

void main(void) {
  geometry.uv = vTexCoord;

  if(picking.isActive > 0.5 && !(picking.isAttribute > 0.5)) {
    fragColor = vec4(vPickingColor, 1.0);
    return;
  }

  vec4 color = simpleMesh.hasTexture ? texture(sampler, vTexCoord) : vColor;
  DECKGL_FILTER_COLOR(color, geometry);

  // Seismic data surfaces are rendered unlit: the color already encodes the data, and directional lighting would
  // wash out amplitudes (especially on near-horizontal depth slices) and make the same surface look different
  // depending on which side it is viewed from.
  fragColor = vec4(color.rgb, color.a * layer.opacity);
}