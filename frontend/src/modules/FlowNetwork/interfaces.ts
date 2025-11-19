import type { DatedFlowNetwork_api, FlowNetworkMetadata_api } from "@api";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    datedNetworksAtom,
    edgeMetadataListAtom,
    nodeMetadataListAtom,
    queryStatusAtom,
} from "./settings/atoms/derivedAtoms";
import {
    selectedDateTimeAtom,
    selectedEdgeKeyAtom,
    selectedNodeKeyAtom,
} from "./settings/atoms/persistableFixableAtoms";
import type { QueryStatus } from "./types";

type SettingsToViewInterface = {
    edgeMetadataList: FlowNetworkMetadata_api[];
    nodeMetadataList: FlowNetworkMetadata_api[];
    datedNetworks: DatedFlowNetwork_api[];
    selectedEdgeKey: string;
    selectedNodeKey: string;
    selectedDateTime: string;
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
        return get(selectedEdgeKeyAtom).value ?? "";
    },
    selectedNodeKey: (get) => {
        return get(selectedNodeKeyAtom).value ?? "";
    },
    selectedDateTime: (get) => {
        return get(selectedDateTimeAtom).value ?? "";
    },
    queryStatus: (get) => {
        return get(queryStatusAtom);
    },
};
