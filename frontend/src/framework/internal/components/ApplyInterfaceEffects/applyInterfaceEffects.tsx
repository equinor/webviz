import type React from "react";

import { useAtom } from "jotai";

import type { ModuleInterfaceTypes } from "@framework/Module";
import type { ModuleInstance } from "@framework/ModuleInstance";


export type ApplyInterfaceEffectsProps<TInterfaces extends ModuleInterfaceTypes> = {
    moduleInstance: ModuleInstance<TInterfaces>;
    children?: React.ReactNode;
};

export function ApplyInterfaceEffectsToView<TInterfaces extends ModuleInterfaceTypes>(
    props: ApplyInterfaceEffectsProps<TInterfaces>,
) {
    useAtom(props.moduleInstance.getSettingsToViewInterfaceEffectsAtom());
    return <>{props.children}</>;
}

export function ApplyInterfaceEffectsToSettings<TInterfaces extends ModuleInterfaceTypes>(
    props: ApplyInterfaceEffectsProps<TInterfaces>,
) {
    useAtom(props.moduleInstance.getViewToSettingsInterfaceEffectsAtom());
    return <>{props.children}</>;
}
