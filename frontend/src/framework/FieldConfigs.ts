export interface FieldConfig {
    fieldIdentifier: string;
    range: [number, number];
}

export class FieldConfigSet {
    private _configMap: Map<string, FieldConfig> = new Map();

    constructor(configArray: FieldConfig[]) {
        for (const config of configArray) {
            this._configMap.set(config.fieldIdentifier, config);
        }
    }

    getConfig(fieldIdentifier: string): FieldConfig | null {
        return this._configMap.get(fieldIdentifier) || null;
    }
}
