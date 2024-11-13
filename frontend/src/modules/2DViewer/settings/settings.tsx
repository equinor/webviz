import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { FieldDropdown } from "@framework/components/FieldDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { useQueryClient } from "@tanstack/react-query";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { layerManagerAtom, userSelectedFieldIdentifierAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom } from "./atoms/derivedAtoms";
import { LayerManagerComponent } from "./components/layerManagerComponent";

import { LayerManager, LayerManagerTopic } from "../layers/LayerManager";
import { GroupDelegateTopic } from "../layers/delegates/GroupDelegate";

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const queryClient = useQueryClient();

    const [layerManager, setLayerManager] = useAtom(layerManagerAtom);

    const fieldIdentifier = useAtomValue(selectedFieldIdentifierAtom);
    const setFieldIdentifier = useSetAtom(userSelectedFieldIdentifierAtom);

    React.useEffect(
        function onMountEffect() {
            const newLayerManager = new LayerManager(props.workbenchSession, props.workbenchSettings, queryClient);
            setLayerManager(newLayerManager);

            const serializedState = window.localStorage.getItem("layerManager");
            if (serializedState) {
                newLayerManager.deserializeState(JSON.parse(serializedState));
            }

            function persistLayerManagerState() {
                window.localStorage.setItem("layerManager", JSON.stringify(newLayerManager.serializeState()));
            }

            const unsubscribeDataRev = newLayerManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(LayerManagerTopic.LAYER_DATA_REVISION)(persistLayerManagerState);

            const unsubscribeExpands = newLayerManager
                .getGroupDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(persistLayerManagerState);

            return function onUnmountEffect() {
                newLayerManager.beforeDestroy();
                unsubscribeDataRev();
                unsubscribeExpands();
            };
        },
        [setLayerManager, props.workbenchSession, props.workbenchSettings, queryClient]
    );

    React.useEffect(
        function onFieldIdentifierChangedEffect() {
            if (!layerManager) {
                return;
            }
            layerManager.updateGlobalSetting("fieldId", fieldIdentifier);
        },
        [fieldIdentifier, layerManager]
    );

    function handleFieldChange(fieldId: string | null) {
        setFieldIdentifier(fieldId);
        if (!layerManager) {
            return;
        }
        layerManager.updateGlobalSetting("fieldId", fieldId);
    }

    return (
        <div className="h-full flex flex-col gap-1">
            <CollapsibleGroup title="Field" expanded>
                <FieldDropdown ensembleSet={ensembleSet} onChange={handleFieldChange} value={fieldIdentifier} />
            </CollapsibleGroup>
            {layerManager && (
                <LayerManagerComponent
                    layerManager={layerManager}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                />
            )}
        </div>
    );
}
