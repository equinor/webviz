import React from "react";

import { ApiService } from "@api";
import { ModuleInstance, moduleApiServiceAtom, moduleInstanceAtom } from "@framework/ModuleInstance";

import { useHydrateAtoms } from "jotai/utils";

export type HydrateModuleApiServiceAtomProps = {
    apiService: ApiService;
    moduleInstance: ModuleInstance<any>;
    children?: React.ReactNode;
};

export function HydrateModuleApiServiceAtom(props: HydrateModuleApiServiceAtomProps) {
    const map = new Map();
    map.set(moduleApiServiceAtom, props.apiService);
    map.set(moduleInstanceAtom, props.moduleInstance);
    useHydrateAtoms(map);
    return <>{props.children}</>;
}
