import { GlobalTopicDefinitions, TopicDefinitionsType } from "@framework/WorkbenchServices";
import { useSubscribedValueConditionally } from "@framework/WorkbenchServices";
import { WorkbenchServices } from "@framework/WorkbenchServices";

export enum SyncSettingKey {
    ENSEMBLE = "ENSEMBLE",
    DATE = "DATE",
    TIME_SERIES = "TIME_SERIES",
    SURFACE = "SURFACE",
    CAMERA_POSITION_MAP = "SUBSURFACE_MAP_CAMERA_POSITION",
    WELLBORE = "WELLBORE",
}

export const SyncSettingsMeta = {
    [SyncSettingKey.ENSEMBLE]: { name: "Ensemble", abbreviation: "ENS" },
    [SyncSettingKey.DATE]: { name: "Date", abbreviation: "DATE" },
    [SyncSettingKey.TIME_SERIES]: { name: "Time series", abbreviation: "TS" },
    [SyncSettingKey.SURFACE]: { name: "Surface", abbreviation: "SURF" },
    [SyncSettingKey.CAMERA_POSITION_MAP]: { name: "Camera Position Map", abbreviation: "CAM_POS_MAP" },
    [SyncSettingKey.WELLBORE]: { name: "Wellbore", abbreviation: "WELLBORE" },
};

export class SyncSettingsHelper {
    private _workbenchServices: WorkbenchServices;
    private _activeSyncedKeys: SyncSettingKey[];

    constructor(activeSyncedKeys: SyncSettingKey[], workbenchServices: WorkbenchServices) {
        this._activeSyncedKeys = activeSyncedKeys;
        this._workbenchServices = workbenchServices;
    }

    isSynced(key: SyncSettingKey): boolean {
        return this._activeSyncedKeys.includes(key);
    }

    useValue<T extends keyof GlobalTopicDefinitions>(key: SyncSettingKey, topic: T): GlobalTopicDefinitions[T] | null {
        const isSyncActiveForKey = this._activeSyncedKeys.includes(key);
        return useSubscribedValueConditionally(topic, isSyncActiveForKey, this._workbenchServices);
    }

    publishValue<T extends keyof GlobalTopicDefinitions>(
        key: SyncSettingKey,
        topic: T,
        value: TopicDefinitionsType<T>
    ) {
        const isSyncActiveForKey = this._activeSyncedKeys.includes(key);
        if (isSyncActiveForKey) {
            this._workbenchServices.publishGlobalData(topic, value);
        }
    }
}
