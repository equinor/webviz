import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { PolygonsAddress } from "@modules/_shared/Polygons/polygonsAddress";
import { SurfaceAddress } from "@modules/_shared/Surface";

import { SurfaceMeshLayerSettings, ViewSettings } from "./_utils";
import {
    meshSurfaceAddressAtom,
    polygonsAddressAtom,
    propertySurfaceAddressAtom,
    selectedWellUuidsAtom,
    surfaceSettingsAtom,
    viewSettingsAtom,
} from "./settings/atoms/baseAtoms";

export type SettingsToViewInterface = {
    meshSurfaceAddress: SurfaceAddress | null;
    propertySurfaceAddress: SurfaceAddress | null;
    polygonsAddress: PolygonsAddress | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings | null;
    viewSettings: ViewSettings | null;
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    meshSurfaceAddress: (get) => {
        return get(meshSurfaceAddressAtom);
    },
    propertySurfaceAddress: (get) => {
        return get(propertySurfaceAddressAtom);
    },
    polygonsAddress: (get) => {
        return get(polygonsAddressAtom);
    },
    selectedWellUuids: (get) => {
        return get(selectedWellUuidsAtom);
    },
    surfaceSettings: (get) => {
        return get(surfaceSettingsAtom);
    },
    viewSettings: (get) => {
        return get(viewSettingsAtom);
    },
};
