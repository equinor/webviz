import { FullSurfaceAddress } from "@modules/_shared/Surface";

import { atom } from "jotai";

export const surfaceAddressAtom = atom<FullSurfaceAddress | null>(null);
