import { atom } from "jotai";

import type { FullSurfaceAddress } from "@modules/_shared/Surface";


export const surfaceAddressAtom = atom<FullSurfaceAddress | null>(null);
