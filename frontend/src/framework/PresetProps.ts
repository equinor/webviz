import { cloneDeep } from "lodash";

export class PresetProps {
    private _presetProps: Record<string, unknown>;

    constructor(presetProps: Record<string, unknown>) {
        this._presetProps = cloneDeep(presetProps);
    }

    set(presetProps: Record<string, unknown>): void {
        this._presetProps = cloneDeep(presetProps);
    }

    get<T>(propName: string, type: "string" | "number" | "boolean" | "object" | "array"): T | undefined {
        const prop = this._presetProps[propName];

        if (prop === undefined) {
            return undefined;
        }

        if (type === "string" && typeof prop === "string") {
            return prop as T;
        }

        if (type === "number" && typeof prop === "number") {
            return prop as T;
        }

        if (type === "boolean" && typeof prop === "boolean") {
            return prop as T;
        }

        if (type === "object" && typeof prop === "object") {
            return prop as T;
        }

        if (type === "array" && Array.isArray(prop)) {
            return prop as T;
        }

        return undefined;
    }

    pis(propName: string, type: "string" | "number" | "boolean" | "object" | "array"): boolean {
        return this.get(propName, type) !== undefined;
    }
}
