import React from "react";

import { cloneDeep } from "lodash";

export type InitialSettingsSupportedTypes = {
    string: string;
    number: number;
    bigint: bigint;
    boolean: boolean;
    object: Record<string, unknown>;
    array: unknown[];
};

export class InitialSettings {
    private _initialSettings: Record<string, unknown>;

    constructor(initialSettings: Record<string, unknown>) {
        this._initialSettings = cloneDeep(initialSettings);
    }

    get<T extends keyof InitialSettingsSupportedTypes>(
        settingName: string,
        type: T
    ): InitialSettingsSupportedTypes[T] | undefined {
        const setting = this._initialSettings[settingName];

        if (setting === undefined) {
            return undefined;
        }

        if (type === "string" && typeof setting === "string") {
            return setting as InitialSettingsSupportedTypes[T];
        }

        if (type === "number" && typeof setting === "number") {
            return setting as InitialSettingsSupportedTypes[T];
        }

        if (type === "bigint" && typeof setting === "bigint") {
            return setting as InitialSettingsSupportedTypes[T];
        }

        if (type === "boolean" && typeof setting === "boolean") {
            return setting as InitialSettingsSupportedTypes[T];
        }

        if (type === "object" && typeof setting === "object") {
            return setting as InitialSettingsSupportedTypes[T];
        }

        if (type === "array" && Array.isArray(setting)) {
            return setting as InitialSettingsSupportedTypes[T];
        }

        throw new Error(`Setting "${settingName}" is not of type "${type}" (value: ${JSON.stringify(setting)})`);
    }

    isSet(settingName: string, type: keyof InitialSettingsSupportedTypes): boolean {
        return this.get(settingName, type) !== undefined;
    }

    applyToStateOnMount(
        settingName: string,
        type: keyof InitialSettingsSupportedTypes,
        stateSetter: (value: any) => void
    ): void {
        React.useEffect(() => {
            const setting = this.get(settingName, type);
            if (setting !== undefined) {
                stateSetter(setting);
            }
        }, []);
    }
}
