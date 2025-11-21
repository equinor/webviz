import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { SERIALIZED_STATE_SCHEMA, type SerializedState } from "./persistence";

export const MODULE_NAME = "PersistableAtomTest";

const description = "Dev module for testing persistableFixableAtom auto-transition logic";

ModuleRegistry.registerModule<Interfaces, SerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "Persistable Atom Test",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    dataTagIds: [],
    description,
    serializedStateSchema: SERIALIZED_STATE_SCHEMA,
});
