import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";
import { IntersectionType } from "@framework/types/intersection";
import { ColorScale } from "@lib/utils/ColorScale";

import { selectedCustomIntersectionPolylineIdAtom, selectedWellboreAtom } from "./settings/atoms/derivedAtoms";
import { layersAtom } from "./settings/atoms/layersAtoms";
import { selectedEnsembleIdentAtom } from "./sharedAtoms/sharedAtoms";
import { BaseLayer } from "./utils/layers/BaseLayer";

export type SettingsToViewInterface = {
    baseStates: {
        showGridlines: boolean;
        gridLayer: number;
        zFactor: number;
        intersectionExtensionLength: number;
        intersectionType: IntersectionType;
        seismicColorScale: ColorScale | null;
        showSeismic: boolean;
    };
    derivedStates: {
        ensembleIdent: EnsembleIdent | null;
        selectedCustomIntersectionPolylineId: string | null;
        layers: BaseLayer<any, any>[];
        wellboreHeader: { uuid: string; identifier: string } | null;
    };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    baseStates: {
        showGridlines: false,
        gridLayer: 1,
        zFactor: 1,
        intersectionExtensionLength: 1000,
        intersectionType: IntersectionType.WELLBORE,
        seismicColorScale: null,
        showSeismic: false,
    },
    derivedStates: {
        ensembleIdent: (get) => {
            return get(selectedEnsembleIdentAtom);
        },
        selectedCustomIntersectionPolylineId: (get) => {
            return get(selectedCustomIntersectionPolylineIdAtom);
        },
        layers: (get) => {
            return get(layersAtom);
        },
        wellboreHeader: (get) => {
            return get(selectedWellboreAtom);
        },
    },
};
