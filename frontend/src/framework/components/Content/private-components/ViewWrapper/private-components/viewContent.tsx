import React from "react";

import { ImportState } from "@framework/Module";
import { ModuleInstance, ModuleInstanceState } from "@framework/ModuleInstance";
import { useStoreValue } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { ErrorBoundary } from "@framework/components/ErrorBoundary";
import { Point } from "@framework/utils/geometry";
import { CircularProgress } from "@lib/components/CircularProgress";

import { ChannelConnector } from "./channelConnector";
import { ChannelConnectorWrapper } from "./channelConnectorWrapper";
import { ChannelSelector } from "./channelSelector";
import { CrashView } from "./crashView";

import { DataChannelEventTypes } from "../../DataChannelVisualization/dataChannelVisualization";

type ViewContentProps = {
    moduleInstance: ModuleInstance<any>;
    workbench: Workbench;
};

export const ViewContent = React.memo((props: ViewContentProps) => {
    const [importState, setImportState] = React.useState<ImportState>(ImportState.NotImported);
    const [moduleInstanceState, setModuleInstanceState] = React.useState<ModuleInstanceState>(
        ModuleInstanceState.INITIALIZING
    );
    const [currentInputName, setCurrentInputName] = React.useState<string | null>(null);
    const [channelSelectorCenterPoint, setChannelSelectorCenterPoint] = React.useState<Point | null>(null);
    const [selectableChannels, setSelectableChannels] = React.useState<string[]>([]);
    const ref = React.useRef<HTMLDivElement>(null);

    const showDataChannelConnections = useStoreValue(props.workbench.getGuiStateStore(), "showDataChannelConnections");

    React.useEffect(() => {
        setImportState(props.moduleInstance.getImportState());

        function handleModuleInstanceImportStateChange() {
            setImportState(props.moduleInstance.getImportState());
        }

        const unsubscribeFunc = props.moduleInstance.subscribeToImportStateChange(
            handleModuleInstanceImportStateChange
        );

        return unsubscribeFunc;
    }, []);

    React.useEffect(() => {
        setModuleInstanceState(props.moduleInstance.getModuleInstanceState());

        function handleModuleInstanceStateChange() {
            setModuleInstanceState(props.moduleInstance.getModuleInstanceState());
        }

        const unsubscribeFunc = props.moduleInstance.subscribeToModuleInstanceStateChange(
            handleModuleInstanceStateChange
        );

        return unsubscribeFunc;
    }, []);

    const handleModuleInstanceReload = React.useCallback(() => {
        props.moduleInstance.reset().then(() => {
            setModuleInstanceState(props.moduleInstance.getModuleInstanceState());
        });
    }, [props.moduleInstance]);

    if (importState === ImportState.NotImported) {
        return <div className="h-full w-full flex justify-center items-center">Not imported</div>;
    }

    if (importState === ImportState.Importing || !props.moduleInstance.isInitialised()) {
        return (
            <div className="h-full w-full flex flex-col justify-center items-center">
                <CircularProgress />
                <div className="mt-4">Importing...</div>
            </div>
        );
    }

    if (importState === ImportState.Failed) {
        return (
            <div className="h-full w-full flex justify-center items-center">
                Module could not be imported. Please check the spelling when registering and initialising the module.
            </div>
        );
    }

    if (
        moduleInstanceState === ModuleInstanceState.INITIALIZING ||
        moduleInstanceState === ModuleInstanceState.RESETTING
    ) {
        const text = moduleInstanceState === ModuleInstanceState.INITIALIZING ? "Initializing..." : "Resetting...";
        return (
            <div className="h-full w-full flex flex-col justify-center items-center">
                <CircularProgress />
                <div className="mt-4">{text}</div>
            </div>
        );
    }

    if (moduleInstanceState === ModuleInstanceState.ERROR) {
        const errorObject = props.moduleInstance.getFatalError();
        if (errorObject) {
            return (
                <CrashView
                    moduleName={props.moduleInstance.getModule().getName()}
                    error={errorObject.err}
                    errorInfo={errorObject.errInfo}
                    onReload={handleModuleInstanceReload}
                />
            );
        }
    }

    function handleChannelConnected(inputName: string, moduleInstanceId: string, destinationPoint: Point) {
        const moduleInstance = props.workbench.getModuleInstance(moduleInstanceId);

        if (!moduleInstance) {
            return;
        }

        const channels = moduleInstance.getBroadcastChannels();

        if (Object.keys(channels).length > 1) {
            setChannelSelectorCenterPoint(destinationPoint);
            setSelectableChannels(Object.values(channels).map((channel) => channel.getName()));
            setCurrentInputName(inputName);
            return;
        }

        const channelName = Object.values(channels)[0].getName();

        props.moduleInstance.setInputChannel(inputName, channelName);
        document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
    }

    function handleCancelChannelSelection() {
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);
        document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
    }

    function handleChannelSelection(channelName: string) {
        if (!currentInputName) {
            return;
        }
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);

        props.moduleInstance.setInputChannel(currentInputName, channelName);
        document.dispatchEvent(new CustomEvent(DataChannelEventTypes.DATA_CHANNEL_DONE));
    }

    const View = props.moduleInstance.getViewFC();
    return (
        <ErrorBoundary moduleInstance={props.moduleInstance}>
            <div className="p-4 h-full w-full" ref={ref}>
                <View
                    moduleContext={props.moduleInstance.getContext()}
                    workbenchSession={props.workbench.getWorkbenchSession()}
                    workbenchServices={props.workbench.getWorkbenchServices()}
                />
                <ChannelConnectorWrapper forwardedRef={ref} visible={showDataChannelConnections}>
                    {props.moduleInstance.getInputChannelDefs().map((channelDef) => {
                        return (
                            <ChannelConnector
                                key={channelDef.name}
                                moduleInstanceId={props.moduleInstance.getId()}
                                inputName={channelDef.name}
                                displayName={channelDef.displayName}
                                channelKeyCategories={channelDef.keyCategories}
                                workbench={props.workbench}
                                onChannelConnected={handleChannelConnected}
                            />
                        );
                    })}
                </ChannelConnectorWrapper>
                {channelSelectorCenterPoint && (
                    <ChannelSelector
                        position={channelSelectorCenterPoint}
                        channelNames={selectableChannels}
                        onCancel={handleCancelChannelSelection}
                        onSelectChannel={handleChannelSelection}
                    />
                )}
            </div>
        </ErrorBoundary>
    );
});

ViewContent.displayName = "ViewWrapper";
