import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { PolygonsAddress } from "@modules/_shared/Polygons/polygonsAddress";
import { RealizationSurfaceAddress, StatisticalSurfaceAddress } from "@modules/_shared/Surface";

import { SurfaceMeshLayerSettings, ViewSettings } from "./_utils";
import {
    meshSurfaceAddressAtom,
    polygonsAddressAtom,
    propertySurfaceAddressAtom,
    selectedWellUuidsAtom,
    surfaceSettingsAtom,
    viewSettingsAtom,
} from "./settings/atoms/baseAtoms";

type SettingsToViewInterface = {
    meshSurfaceAddress: RealizationSurfaceAddress | StatisticalSurfaceAddress | null;
    propertySurfaceAddress: RealizationSurfaceAddress | StatisticalSurfaceAddress | null;
    polygonsAddress: PolygonsAddress | null;
    selectedWellUuids: string[];
    surfaceSettings: SurfaceMeshLayerSettings | null;
    viewSettings: ViewSettings | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
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
