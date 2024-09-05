/**
 * Well log viewer module.
 * @author Anders Rantala Hunderi
 * @since 08.14.2024
 */
import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { InterfaceTypes } from "./interfaces";
import { clearStorageForInstance } from "./settings/atoms/persistedAtoms";

export const MODULE_NAME = "WellLogViewer";
const MODULE_TITLE = "Well log Viewer";
// TODO: Better description
const MODULE_DESCRIPTION = "Well log Viewer";
// TODO: preview Icon

ModuleRegistry.registerModule<InterfaceTypes>({
    moduleName: MODULE_NAME,
    defaultTitle: MODULE_TITLE,
    description: MODULE_DESCRIPTION,

    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,

    syncableSettingKeys: [SyncSettingKey.INTERSECTION, SyncSettingKey.VERTICAL_SCALE],
    onUnloadInstance(instanceId) {
        clearStorageForInstance(instanceId);
    },
});
