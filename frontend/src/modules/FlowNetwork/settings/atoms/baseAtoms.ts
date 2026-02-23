import { atom } from "jotai";

import { Frequency_api, NodeType_api } from "@api";

export const selectedResamplingFrequencyAtom = atom<Frequency_api>(Frequency_api.YEARLY);
export const selectedNodeTypesAtom = atom<Set<NodeType_api>>(
    new Set([NodeType_api.INJ, NodeType_api.PROD, NodeType_api.OTHER]),
);
