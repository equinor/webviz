import type { EnsembleFipRegions } from "@framework/EnsembleFipRegions";

/**
 * Check whether two FIP region mappings are compatible.
 * Compatible means every fip number maps to the same zone/region in both.
 */
export function areFipMappingsCompatible(a: EnsembleFipRegions, b: EnsembleFipRegions): boolean {
    const aArr = a.getFipMappingArr();
    const bArr = b.getFipMappingArr();
    if (aArr.length !== bArr.length) return false;

    for (const entry of aArr) {
        const bEntry = b.getZoneRegionForFipNumber(entry.fipNumber);
        if (!bEntry || bEntry.zone !== entry.zone || bEntry.region !== entry.region) return false;
    }
    return true;
}
