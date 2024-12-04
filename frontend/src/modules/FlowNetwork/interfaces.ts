import { DatedFlowNetwork_api, FlowNetworkMetadata_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    datedNetworksAtom,
    edgeMetadataListAtom,
    nodeMetadataListAtom,
    queryStatusAtom,
    selectedDateTimeAtom,
    selectedEdgeKeyAtom,
    selectedNodeKeyAtom,
} from "./settings/atoms/derivedAtoms";
import { QueryStatus } from "./types";

type SettingsToViewInterface = {
    edgeMetadataList: FlowNetworkMetadata_api[];
    nodeMetadataList: FlowNetworkMetadata_api[];
    datedNetworks: DatedFlowNetwork_api[];
    selectedEdgeKey: string; // | null;
    selectedNodeKey: string; // | null;
    selectedDateTime: string; // | null;
    queryStatus: QueryStatus;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    edgeMetadataList: (get) => {
        return get(edgeMetadataListAtom);
    },
    nodeMetadataList: (get) => {
        return get(nodeMetadataListAtom);
    },
    datedNetworks: (get) => {
        return get(datedNetworksAtom);
    },
    selectedEdgeKey: (get) => {
        return get(selectedEdgeKeyAtom) ?? "";
    },
    selectedNodeKey: (get) => {
        return get(selectedNodeKeyAtom) ?? "";
    },
    selectedDateTime: (get) => {
        return get(selectedDateTimeAtom) ?? "";
    },
    queryStatus: (get) => {
        return get(queryStatusAtom);
    },
};
