import { ModuleRegistry } from "@framework/ModuleRegistry";

import { SharedState } from "./implementation";

ModuleRegistry.registerModule<SharedState>({ moduleName: "DbgWorkbenchSpy", defaultTitle: "Debug Workbench Spy" });
