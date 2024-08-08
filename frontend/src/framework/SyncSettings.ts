/**
 * Why are we disabling rules-of-hooks here?
 *
 * Well, we are using several hooks in this class, which is not allowed by this rule.
 * However, we are not using these hooks in a component, but in a utility class.
 * The important thing to remember is that these functions must be called on every render,
 * unconditionally (i.e. not in a conditional statement) and not in a loop.
 * This is exactly what we are doing here. We are only using the class to group the functions together
 * and give additional context to the functions.
 */

/* eslint-disable react-hooks/rules-of-hooks */
import { GlobalTopicDefinitions, TopicDefinitionsType } from "@framework/WorkbenchServices";
import { useSubscribedValueConditionally } from "@framework/WorkbenchServices";
import { WorkbenchServices } from "@framework/WorkbenchServices";

import { SettingsContext, ViewContext } from "./ModuleContext";

export enum SyncSettingKey {
    ENSEMBLE = "ENSEMBLE",
    DATE = "DATE",
    TIME_SERIES = "TIME_SERIES",
    SURFACE = "SURFACE",
    CAMERA_POSITION_MAP = "SUBSURFACE_MAP_CAMERA_POSITION",
    CAMERA_POSITION_INTERSECTION = "INTERSECTION_CAMERA_POSITION",
    WELLBORE = "WELLBORE",
    INTERSECTION = "INTERSECTION",
    VERTICAL_SCALE = "VERTICAL_SCALE",
}

export const SyncSettingsMeta = {
    [SyncSettingKey.ENSEMBLE]: { name: "Ensemble", abbreviation: "ENS" },
    [SyncSettingKey.DATE]: { name: "Date", abbreviation: "DATE" },
    [SyncSettingKey.TIME_SERIES]: { name: "Time series", abbreviation: "TS" },
    [SyncSettingKey.SURFACE]: { name: "Surface", abbreviation: "SURF" },
    [SyncSettingKey.CAMERA_POSITION_MAP]: { name: "Camera Position Map", abbreviation: "CAM_POS_MAP" },
    [SyncSettingKey.WELLBORE]: { name: "Wellbore", abbreviation: "WELLBORE" },
    [SyncSettingKey.INTERSECTION]: { name: "Intersection", abbreviation: "INT" },
    [SyncSettingKey.CAMERA_POSITION_INTERSECTION]: {
        name: "Camera Position Intersection",
        abbreviation: "CAM",
    },
    [SyncSettingKey.VERTICAL_SCALE]: { name: "Vertical Scale", abbreviation: "VSCAL" },
};

export class SyncSettingsHelper {
    private _workbenchServices: WorkbenchServices;
    private _moduleContext: SettingsContext<any> | ViewContext<any> | null;
    private _activeSyncedKeys: SyncSettingKey[];

    constructor(
        activeSyncedKeys: SyncSettingKey[],
        workbenchServices: WorkbenchServices,
        moduleContext?: SettingsContext<any> | ViewContext<any>
    ) {
        this._activeSyncedKeys = activeSyncedKeys;
        this._workbenchServices = workbenchServices;
        this._moduleContext = moduleContext ?? null;
    }

    isSynced(key: SyncSettingKey): boolean {
        return this._activeSyncedKeys.includes(key);
    }

    useValue<T extends keyof GlobalTopicDefinitions>(key: SyncSettingKey, topic: T): GlobalTopicDefinitions[T] | null {
        const isSyncActiveForKey = this._activeSyncedKeys.includes(key);
        return useSubscribedValueConditionally(
            topic,
            isSyncActiveForKey,
            this._workbenchServices,
            this._moduleContext?.getInstanceIdString()
        );
    }

    publishValue<T extends keyof GlobalTopicDefinitions>(
        key: SyncSettingKey,
        topic: T,
        value: TopicDefinitionsType<T>
    ) {
        const isSyncActiveForKey = this._activeSyncedKeys.includes(key);
        if (isSyncActiveForKey) {
            this._workbenchServices.publishGlobalData(topic, value, this._moduleContext?.getInstanceIdString());
        }
    }
}
