import React from "react";

import { ModuleInterfaceTypes } from "@framework/Module";
import { ModuleInstance } from "@framework/ModuleInstance";

import { useAtom } from "jotai";

export type ApplyInterfaceEffectsProps<TInterfaces extends ModuleInterfaceTypes> = {
    moduleInstance: ModuleInstance<TInterfaces>;
    children?: React.ReactNode;
};

export function ApplyInterfaceEffectsToView<TInterfaces extends ModuleInterfaceTypes>(
    props: ApplyInterfaceEffectsProps<TInterfaces>
) {
    useAtom(props.moduleInstance.getSettingsToViewInterfaceEffectsAtom());
    return <>{props.children}</>;
}

export function ApplyInterfaceEffectsToSettings<TInterfaces extends ModuleInterfaceTypes>(
    props: ApplyInterfaceEffectsProps<TInterfaces>
) {
    useAtom(props.moduleInstance.getViewToSettingsInterfaceEffectsAtom());
    return <>{props.children}</>;
}
