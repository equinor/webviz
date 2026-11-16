/**
 * Well log viewer module.
 * @author Anders Rantala Hunderi
 * @since 08.14.2024
 */
import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import type { InterfaceTypes } from "./interfaces";
import type { SerializedState } from "./persistence";
import { STATE_SCHEMA } from "./persistence";
import { preview } from "./preview";

export const MODULE_NAME = "WellLogViewer";
const MODULE_TITLE = "Well log Viewer";
const MODULE_DESCRIPTION = "Visualize data logs along well trajectories.";

ModuleRegistry.registerModule<InterfaceTypes, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: MODULE_TITLE,
    description: MODULE_DESCRIPTION,
    preview,
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    syncableSettingKeys: [SyncSettingKey.INTERSECTION, SyncSettingKey.VERTICAL_SCALE],
    serializedStateSchema: STATE_SCHEMA,
    dataTagIds: [ModuleDataTagId.DRILLED_WELLS],
});
