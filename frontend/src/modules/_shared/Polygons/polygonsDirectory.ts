import { PolygonsAttributeType_api, PolygonsMeta_api } from "@api";

export type PolygonsDirectoryOptions = {
    polygonsMetas: PolygonsMeta_api[];
    includeAttributeTypes?: PolygonsAttributeType_api[];
    excludeAttributeTypes?: PolygonsAttributeType_api[];
};

// Class responsible for managing a directory of polygons sets.
export class PolygonsDirectory {
    private _polygonsList: PolygonsMeta_api[] = [];

    // Constructs a PolygonsDirectory with optional content filter criteria.
    constructor(options: PolygonsDirectoryOptions | null) {
        if (!options) return;

        let filteredList = options.polygonsMetas;

        if (options.includeAttributeTypes && options.includeAttributeTypes.length > 0) {
            const includeAttributeTypes = options.includeAttributeTypes;
            filteredList = filteredList.filter((polygons) => includeAttributeTypes.includes(polygons.attribute_type));
        }
        if (options.excludeAttributeTypes && options.excludeAttributeTypes.length) {
            const excludeAttributeTypes = options.excludeAttributeTypes;
            filteredList = filteredList.filter((polygons) => !excludeAttributeTypes.includes(polygons.attribute_type));
        }

        this._polygonsList = filteredList;
    }

    // Retrieves unique attribute names with optional filtering on polygons name.
    public getAttributeNames(requirePolygonsName: string | null): string[] {
        let filteredList = this._polygonsList;
        if (requirePolygonsName) {
            filteredList = filterOnName(filteredList, requirePolygonsName);
        }
        return [...new Set(filteredList.map((polygons) => polygons.attribute_name))].sort();
    }

    // Retrieves unique polygons names with optional filtering on polygons attribute.
    public getPolygonsNames(requireAttributeName: string | null): string[] {
        let filteredList = this._polygonsList;
        if (requireAttributeName) {
            filteredList = filterOnAttribute(filteredList, requireAttributeName);
        }
        return [...new Set(filteredList.map((polygons) => polygons.name))];
    }

    // Checks if a given name and attribute pair exists.
    public nameAttributePairExists(polygonsName: string | null, attributeName: string | null): boolean {
        if (!attributeName || !polygonsName) return false;
        return this._polygonsList.some(
            (polygons) => polygons.name === polygonsName && polygons.attribute_name === attributeName
        );
    }
}

// Filters directory based on a specific polygons attribute.
function filterOnAttribute(polygonsList: PolygonsMeta_api[], polygonsAttribute: string): PolygonsMeta_api[] {
    return polygonsList.filter((polygons) => polygons.attribute_name === polygonsAttribute);
}

// Filters directory based on a specific polygons name.
function filterOnName(polygonsList: PolygonsMeta_api[], polygonsName: string): PolygonsMeta_api[] {
    return polygonsList.filter((polygons) => polygons.name === polygonsName);
}
