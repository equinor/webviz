import { InplaceVolumetricsTableDefinition_api } from "@api";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";
import InplaceVolumetricsTable from "@modules/InplaceVolumetricsTable/components/InplaceVolumetricsTable";
import { QueriesStatus } from "@modules/InplaceVolumetricsTable/types";
import { InplaceVolumesTablesInfoAccessor } from "@modules/_shared/InplaceVolumetrics/InplaceVolumetricsTablesInfoAccessor";

import { atom } from "jotai";

import {
    colorByAtom,
    groupByAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedInplaceFluidZonesAtom,
    userSelectedInplaceIndexesAtom,
    userSelectedInplaceResponseAtom,
    userSelectedInplaceTableNameAtom,
} from "./baseAtoms";
import { inplaceTableDefinitionsQueriesAtom } from "./queryAtoms";

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);
    const groupBy = get(groupByAtom);
    const colorBy = get(colorByAtom);
    let computedEnsembleIdents = userSelectedEnsembleIdents.filter((el) => ensembleSet.hasEnsemble(el));
    if (computedEnsembleIdents.length === 0 && ensembleSet.getEnsembleArr().length > 0) {
        computedEnsembleIdents = [ensembleSet.getEnsembleArr()[0].getIdent()];
    }
    if (computedEnsembleIdents.length > 1 && groupBy !== "Ensemble" && colorBy !== "Ensemble") {
        computedEnsembleIdents = [computedEnsembleIdents[0]];
    }

    return computedEnsembleIdents;
});

export const isInplaceTableDefinitionsQueriesFetchingAtom = atom<boolean>((get) => {
    const inplaceTableDefinitionsQueries = get(inplaceTableDefinitionsQueriesAtom);

    return inplaceTableDefinitionsQueries.isFetching;
});

export const inplaceVolumetricsTableInfosAccessorAtom = atom((get) => {
    const inplaceTableDefinitionsQueries = get(inplaceTableDefinitionsQueriesAtom);
    const isFetching = get(isInplaceTableDefinitionsQueriesFetchingAtom);
    if (isFetching) {
        return new InplaceVolumesTablesInfoAccessor([]);
    }

    const accessor = new InplaceVolumesTablesInfoAccessor(inplaceTableDefinitionsQueries.tableInfos);
    return accessor;
});

export const selectedInplaceTableNameAtom = atom((get) => {
    const accessor = get(inplaceVolumetricsTableInfosAccessorAtom);
    const availableInplaceTableNames = accessor.getTableNames();

    const userSelectedInplaceTableName = get(userSelectedInplaceTableNameAtom);
    if (userSelectedInplaceTableName && availableInplaceTableNames.includes(userSelectedInplaceTableName)) {
        return userSelectedInplaceTableName;
    }
    return availableInplaceTableNames.length ? availableInplaceTableNames[0] : null;
});

export const selectedInplaceFluidZonesAtom = atom((get) => {
    const accessor = get(inplaceVolumetricsTableInfosAccessorAtom);
    const availableInplaceFluidZones = accessor.getFluidZones();

    const userSelectedInplaceFluidZones = get(userSelectedInplaceFluidZonesAtom);

    if (userSelectedInplaceFluidZones.length === 0) {
        return availableInplaceFluidZones;
    }

    const intersection = availableInplaceFluidZones.filter((zone) => userSelectedInplaceFluidZones.includes(zone));

    return intersection;
});

export const selectedInplaceResponseAtom = atom((get) => {
    const accessor = get(inplaceVolumetricsTableInfosAccessorAtom);
    const availableInplaceResponses = accessor.getResponseNames();

    const userSelectedInplaceResponse = get(userSelectedInplaceResponseAtom);
    if (userSelectedInplaceResponse && availableInplaceResponses.includes(userSelectedInplaceResponse)) {
        return userSelectedInplaceResponse;
    }
    if (availableInplaceResponses.length) {
        if (availableInplaceResponses.includes("STOIIP")) {
            return "STOIIP";
        }
        if (availableInplaceResponses.includes("GIIP")) {
            return "GIIP";
        }
        return availableInplaceResponses[0];
    }
    return null;
});

export const selectedInplaceIndexesAtom = atom((get) => {
    const accessor = get(inplaceVolumetricsTableInfosAccessorAtom);
    const availableInplaceIndexes = accessor.getIndexes();

    const userSelectedInplaceIndexes = get(userSelectedInplaceIndexesAtom);

    if (userSelectedInplaceIndexes.length) {
        return availableInplaceIndexes.map((category) => {
            const userSelectedIndex = userSelectedInplaceIndexes.find(
                (selectedIndex) => selectedIndex.index_name === category.index_name
            );
            if (userSelectedIndex && userSelectedIndex.values.length) {
                return userSelectedIndex;
            }
            return category;
        });
    }

    return availableInplaceIndexes;
});
