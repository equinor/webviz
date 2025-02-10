import { log } from "@deck.gl/core";
import { MeshAttributes } from "@loaders.gl/schema";
import { Geometry } from "@luma.gl/engine";

import { Mesh } from "../types";

function normalizeGeometryAttributes(attributes: MeshAttributes): MeshAttributes {
    const positionAttribute = attributes.positions || attributes.POSITION;
    log.assert(positionAttribute, 'no "postions" or "POSITION" attribute in mesh');

    const vertexCount = positionAttribute.value.length / positionAttribute.size;
    let colorAttribute = attributes.COLOR_0 || attributes.colors;
    if (!colorAttribute) {
        colorAttribute = { size: 3, value: new Float32Array(vertexCount * 3).fill(1) };
    }
    let normalAttribute = attributes.NORMAL || attributes.normals;
    if (!normalAttribute) {
        normalAttribute = { size: 3, value: new Float32Array(vertexCount * 3).fill(0) };
    }
    let texCoordAttribute = attributes.TEXCOORD_0 || attributes.texCoords;
    if (!texCoordAttribute) {
        texCoordAttribute = { size: 2, value: new Float32Array(vertexCount * 2).fill(0) };
    }

    return {
        positions: positionAttribute,
        colors: colorAttribute,
        normals: normalAttribute,
        texCoords: texCoordAttribute,
    };
}

/*
 * Convert mesh data into geometry
 * @returns {Geometry} geometry
 */
export function getGeometry(data: Mesh): Geometry {
    if (data instanceof Geometry) {
        // @ts-expect-error data.attributes is readonly
        data.attributes = normalizeGeometryAttributes(data.attributes);
        return data;
    } else if ((data as any).attributes) {
        return new Geometry({
            ...data,
            topology: "triangle-list",
            attributes: normalizeGeometryAttributes((data as any).attributes),
        });
    } else {
        return new Geometry({
            topology: "triangle-list",
            attributes: normalizeGeometryAttributes(data as MeshAttributes),
        });
    }
}
