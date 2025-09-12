import type { Getter } from "jotai";

import type { DeserializeStateFunction } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { setIfDefined } from "@framework/utils/atomUtils";

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

export const deserializeSettingsStateFunction: DeserializeStateFunction<SerializedState["settings"]> = (raw, set) => {
    setIfDefined(set, myPersistableAtom, raw.myData);
};

const module = ModuleRegistry.initModule<Interfaces, SerializedState>("MyModule", {
    settingsToViewInterfaceInitialization,
    serializeStateFunctions: {
        settings: serializeSettingsStateFunction,
    },
    deserializeStateFunctions: {
        settings: deserializeSettingsStateFunction,
    },
});

module.viewFC = View;
module.settingsFC = Settings;
