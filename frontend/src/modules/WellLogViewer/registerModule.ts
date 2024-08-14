/**
 * Well log viewer module.
 * @author Anders Rantala Hunderi
 * @since 08.14.2024
 */
import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

export const MODULE_NAME = "WellLogViewer";
const MODULE_TITLE = "Well log Viewer";
// TODO: Better description
const MODULE_DESCRIPTION = "Well log Viewer";
// TODO: preview Icon

ModuleRegistry.registerModule<State>({
    moduleName: MODULE_NAME,
    defaultTitle: MODULE_TITLE,
    description: MODULE_DESCRIPTION,

    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
});
