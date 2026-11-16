import { atom } from "jotai";

import type { AnySurfaceAddress } from "@modules/_shared/Surface";


export const surfaceAddressAtom = atom<AnySurfaceAddress | null>(null);
