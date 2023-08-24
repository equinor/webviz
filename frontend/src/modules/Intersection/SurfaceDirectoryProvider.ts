import { StaticSurfaceDirectory_api } from "@api";
import { UseQueryResult } from "@tanstack/react-query";

export class SurfaceDirectoryProvider {
    private _availableNames: string[] = [];
    private _availableAttributes: string[] = [];

    constructor(surfaceDirectoryQuery: UseQueryResult<StaticSurfaceDirectory_api>) {
        if (surfaceDirectoryQuery.data) {
            // DROGON HACK
            surfaceDirectoryQuery.data.names.forEach((item, idx) => {
                if (
                    item.includes("Top") ||
                    item.includes("top") ||
                    item.includes("TOP") ||
                    item.includes("Base") ||
                    item.includes("base") ||
                    item.includes("BASE")
                ) {
                    this._availableNames.push(item);
                }
            });

            surfaceDirectoryQuery.data.attributes.forEach((item, idx) => {
                if (!item.includes("Average")) {
                    this._availableAttributes.push(item);
                }
            });
        }
    }

    getAttributes(): string[] {
        return this._availableAttributes;
    }
    getNames(): string[] {
        return this._availableNames;
    }
}
