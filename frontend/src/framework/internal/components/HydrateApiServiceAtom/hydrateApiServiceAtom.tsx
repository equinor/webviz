import React from "react";

import { ApiService } from "@api";
import { moduleApiServiceAtom } from "@framework/ModuleInstance";

import { useHydrateAtoms } from "jotai/utils";

export type HydrateModuleApiServiceAtomProps = {
    apiService: ApiService;
    children?: React.ReactNode;
};

export function HydrateModuleApiServiceAtom(props: HydrateModuleApiServiceAtomProps) {
    const map = new Map();
    map.set(moduleApiServiceAtom, props.apiService);
    useHydrateAtoms(map);
    return <>{props.children}</>;
}
