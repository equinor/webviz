export enum ElevatedSetting {
    REALIZATION = "realization",
}

export type ElevatedSettingData = {
    [ElevatedSetting.REALIZATION]: number | null;
};

export class ElevatedSettingsService {
    private _elevatedSettings: Partial<ElevatedSettingData> = {};

    getSetting<T extends ElevatedSetting>(setting: T): ElevatedSettingData[T] {
        return this._elevatedSettings[setting] ?? null;
    }

    setSetting<T extends ElevatedSetting>(setting: T, value: ElevatedSettingData[T]): void {
        this._elevatedSettings[setting] = value;
    }
}
