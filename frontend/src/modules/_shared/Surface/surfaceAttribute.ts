import type { SurfaceAttribute } from "./surfaceAddress";

export function isSameAttribute(a: SurfaceAttribute | null, b: SurfaceAttribute | null): boolean {
    if (a === null || b === null) {
        return a === b;
    }
    if (a.kind !== b.kind) {
        return false;
    }
    if (a.kind === "TAGNAME") {
        return a.tag_name === (b as Extract<SurfaceAttribute, { kind: "TAGNAME" }>).tag_name;
    }

    const bStdRes = b as Extract<SurfaceAttribute, { kind: "STDRES" }>;
    return a.std_res_name === bStdRes.std_res_name && (a.sub_name ?? null) === (bStdRes.sub_name ?? null);
}

// Unambiguous tuple encoding; never delimiter concatenation or display labels, which are not unique identifiers.
export function surfaceAttributeKey(attribute: SurfaceAttribute): string {
    if (attribute.kind === "TAGNAME") {
        return JSON.stringify(["TAGNAME", attribute.tag_name]);
    }

    return JSON.stringify(["STDRES", attribute.std_res_name, attribute.sub_name ?? null]);
}

// Standard-result provenance is a UI label here; it must never be parsed back out as an identifier.
export function getSurfaceAttributeDisplayLabel(attribute: SurfaceAttribute): string {
    if (attribute.kind === "TAGNAME") {
        return attribute.tag_name;
    }

    return `${attribute.std_res_name} (standard result)`;
}

export function dedupeSurfaceAttributes(attributes: SurfaceAttribute[]): SurfaceAttribute[] {
    const seenKeys = new Set<string>();
    const result: SurfaceAttribute[] = [];

    for (const attribute of attributes) {
        const key = surfaceAttributeKey(attribute);
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            result.push(attribute);
        }
    }

    return result;
}
