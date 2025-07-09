import type { Getter, Setter } from "jotai";

import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";
import { settingsToViewInterfaceInitialization } from "./interfaces";
import type { SerializedState } from "./persistedState";
import { myPersistableAtom } from "./settings/atoms/baseAtoms";
import { Settings } from "./settings/settings";
import { View } from "./view";

function serializeSettingsStateFunction(get: Getter): SerializedState["settings"] {
    return {
        myData: get(myPersistableAtom).value,
    };
}

function deserializeSettingsStateFunction(raw: SerializedState["settings"], set: Setter): void {
    set(myPersistableAtom, raw.myData);
}

const module = ModuleRegistry.initModule<Interfaces, SerializedState>("MyModule", {
    settingsToViewInterfaceInitialization,
    serializeStateFunctions: {
        settings: serializeSettingsStateFunction,
        view: undefined,
    },
    deserializeStateFunctions: {
        settings: deserializeSettingsStateFunction,
    },
});

module.viewFC = View;
module.settingsFC = Settings;
