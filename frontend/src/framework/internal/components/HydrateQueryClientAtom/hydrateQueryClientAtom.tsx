import type React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useHydrateAtoms } from "jotai/utils";
import { queryClientAtom } from "jotai-tanstack-query";

export type HydrateQueryClientAtomProps = {
    children?: React.ReactNode;
};

export const HydrateQueryClientAtom: React.FC<HydrateQueryClientAtomProps> = (props) => {
    const queryClient = useQueryClient();
    const map = new Map();
    map.set(queryClientAtom, queryClient);
    useHydrateAtoms(map);
    return <>{props.children}</>;
};

HydrateQueryClientAtom.displayName = "HydrateQueryClientAtom";
