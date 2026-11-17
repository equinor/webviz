import type { Frequency_api } from "@api";
import type { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    colorRealizationsByParameterAtom,
    groupByAtom,
    resampleFrequencyAtom,
    showHistoricalAtom,
    showTimestampMarkerAtom,
    showObservationsAtom,
    statisticsSelectionAtom,
    subplotLimitDirectionAtom,
    subplotMaxDirectionElementsAtom,
    visualizationModeAtom,
} from "./settings/atoms/baseAtoms";
import { parameterIdentAtom, vectorSpecificationsAtom } from "./settings/atoms/derivedAtoms";
import { selectedEnsembleIdentsAtom } from "./settings/atoms/persistableFixableAtoms";
import type {
    GroupBy,
    StatisticsSelection,
    SubplotLimitDirection,
    VectorSpec,
    VisualizationMode,
} from "./typesAndEnums";
import { activeTimestampUtcMsAtom } from "./view/atoms/persistableFixableAtoms";

export type SettingsToViewInterface = {
    groupBy: GroupBy;
    subplotLimitation: {
        direction: SubplotLimitDirection;
        maxDirectionElements: number;
    };
    visualizationMode: VisualizationMode;
    showObservations: boolean;
    showHistorical: boolean;
    showTimestampMarker: boolean;
    vectorSpecifications: VectorSpec[];
    statisticsSelection: StatisticsSelection;
    colorByParameter: boolean;
    parameterIdent: ParameterIdent | null;
    selectedEnsembleIdents: (RegularEnsembleIdent | DeltaEnsembleIdent)[] | null;
    resampleFrequency: Frequency_api | null;
};

export type ViewToSettingsInterface = {
    selectedTimestampUtcMs: number | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
    viewToSettings: ViewToSettingsInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    groupBy: (get) => {
        return get(groupByAtom);
    },
    subplotLimitation: (get) => {
        return {
            direction: get(subplotLimitDirectionAtom),
            maxDirectionElements: get(subplotMaxDirectionElementsAtom),
        };
    },
    visualizationMode: (get) => {
        return get(visualizationModeAtom);
    },
    showObservations: (get) => {
        return get(showObservationsAtom);
    },
    showHistorical: (get) => {
        return get(showHistoricalAtom);
    },
    showTimestampMarker: (get) => {
        return get(showTimestampMarkerAtom);
    },
    vectorSpecifications: (get) => {
        return get(vectorSpecificationsAtom);
    },
    statisticsSelection: (get) => {
        return get(statisticsSelectionAtom);
    },
    colorByParameter: (get) => {
        return get(colorRealizationsByParameterAtom);
    },
    parameterIdent: (get) => {
        return get(parameterIdentAtom);
    },
    selectedEnsembleIdents: (get) => {
        const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
        return selectedEnsembleIdents.isValidInContext ? selectedEnsembleIdents.value : null;
    },
    resampleFrequency: (get) => {
        return get(resampleFrequencyAtom);
    },
};

export const viewToSettingsInterfaceInitialization: InterfaceInitialization<ViewToSettingsInterface> = {
    selectedTimestampUtcMs: (get) => {
        return get(activeTimestampUtcMsAtom).value;
    },
};
