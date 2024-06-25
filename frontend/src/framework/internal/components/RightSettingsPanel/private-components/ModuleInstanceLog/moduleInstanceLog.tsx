import React from "react";

import { GuiState, RightDrawerContent, useGuiValue } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { StatusMessageType } from "@framework/ModuleInstanceStatusController";
import { Workbench } from "@framework/Workbench";
import { useStatusControllerStateValue } from "@framework/internal/ModuleInstanceStatusControllerInternal";
import { Drawer } from "@framework/internal/components/Drawer";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { Error, History, Warning } from "@mui/icons-material";

export type ModuleInstanceLogProps = {
    workbench: Workbench;
    onClose: () => void;
};

export function ModuleInstanceLog(props: ModuleInstanceLogProps): React.ReactNode {
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.RightDrawerContent);
    const activeModuleInstanceId = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.ActiveModuleInstanceId);

    const moduleInstance = props.workbench.getModuleInstance(activeModuleInstanceId);

    function handleClose() {
        props.onClose();
    }

    return (
        <Drawer
            title="Module instance log"
            icon={<History />}
            visible={drawerContent === RightDrawerContent.ModuleInstanceLog}
            onClose={handleClose}
        >
            <div className="flex flex-col p-2 gap-4 overflow-y-auto">
                {moduleInstance ? <LogList moduleInstance={moduleInstance} /> : <>No module selected.</>}
            </div>
        </Drawer>
    );
}

type LogListProps = {
    moduleInstance: ModuleInstance<any, any, any, any>;
};

function LogList(props: LogListProps): React.ReactNode {
    const coldStatusMessages = useStatusControllerStateValue(
        props.moduleInstance.getStatusController(),
        "coldMessageCache"
    );

    return (
        <>
            {coldStatusMessages.map((entry, i) => (
                <div key={`${entry.message}-${i}`} className="flex items-center gap-2">
                    {entry.type === StatusMessageType.Error && <Error fontSize="small" color="error" />}
                    {entry.type === StatusMessageType.Warning && <Warning fontSize="small" color="warning" />}
                    <span className="text-sm text-gray-500">{timestampUtcMsToCompactIsoString(entry.datetimeMs)}</span>
                    <span
                        className="ml-2 overflow-hidden text-ellipsis min-w-0 whitespace-nowrap"
                        title={entry.message}
                    >
                        {entry.message}
                    </span>
                </div>
            ))}
        </>
    );
}
