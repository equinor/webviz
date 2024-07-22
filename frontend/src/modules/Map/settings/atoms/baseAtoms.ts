import { SurfaceAddress } from "@modules/_shared/Surface";

import { atom } from "jotai";

export const surfaceAddressAtom = atom<SurfaceAddress | null>(null);
