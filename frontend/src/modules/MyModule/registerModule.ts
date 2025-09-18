import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { InterfaceTypes } from "@modules/WellLogViewer/interfaces";

ModuleRegistry.registerModule<InterfaceTypes>({
    moduleName: "MyModule",
    defaultTitle: "My Module",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description: "My module description",
});
