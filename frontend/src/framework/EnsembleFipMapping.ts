export interface FipMapping {
    readonly fipNumber: number;
    readonly zone: string;
    readonly region: string;
}

export class EnsembleFipMapping {
    private _data: FipMapping[];
    // Composite key: "zone|region" -> fipNumber
    private _zoneRegionToFip = new Map<string, number>();
    // fipNumber -> {zone, region}
    private _fipToZoneRegion = new Map<number, { zone: string; region: string }>();

    constructor(data: FipMapping[]) {
        this._data = data;
        data.forEach((item) => {
            this._zoneRegionToFip.set(`${item.zone}|${item.region}`, item.fipNumber);
            this._fipToZoneRegion.set(item.fipNumber, { zone: item.zone, region: item.region });
        });
    }

    /**
     * Get FIP number for a given zone and region combination.
     */
    getFipNumberForZoneRegion(zone: string, region: string): number | undefined {
        return this._zoneRegionToFip.get(`${zone}|${region}`);
    }

    /**
     * Get zone and region for a given FIP number.
     */
    getZoneRegionForFipNumber(fipNumber: number): { zone: string; region: string } | undefined {
        return this._fipToZoneRegion.get(fipNumber);
    }

    /**
     * Get all unique FIP numbers.
     */
    getFipNumbers(): number[] {
        return Array.from(this._fipToZoneRegion.keys());
    }

    /**
     * Get all unique zones.
     */
    getZones(): string[] {
        return [...new Set(this._data.map((d) => d.zone))];
    }

    /**
     * Get all unique regions.
     */
    getRegions(): string[] {
        return [...new Set(this._data.map((d) => d.region))];
    }

    /**
     * Get regions that exist in combination with any of the given zones.
     * If zones is empty, returns all regions.
     */
    getRegionsForZones(zones: string[]): string[] {
        if (zones.length === 0) return this.getRegions();
        const zoneSet = new Set(zones);
        return [...new Set(this._data.filter((d) => zoneSet.has(d.zone)).map((d) => d.region))];
    }

    /**
     * Get zones that exist in combination with any of the given regions.
     * If regions is empty, returns all zones.
     */
    getZonesForRegions(regions: string[]): string[] {
        if (regions.length === 0) return this.getZones();
        const regionSet = new Set(regions);
        return [...new Set(this._data.filter((d) => regionSet.has(d.region)).map((d) => d.zone))];
    }

    /**
     * Get the raw FIP mapping array.
     */
    getFipMappingArr(): readonly FipMapping[] {
        return this._data;
    }
}
