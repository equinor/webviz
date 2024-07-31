import React from "react";

import { ViewContext } from "@framework/ModuleContext";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { WorkbenchServices } from "@framework/WorkbenchServices";

import { HoverUpdateWrapper, HoverUpdateWrapperProps } from "./HoverUpdateWrapper";

export type SyncedSettingsUpdateWrapperProps = {
    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<any>;
} & HoverUpdateWrapperProps;

export function SyncedSettingsUpdateWrapper(props: SyncedSettingsUpdateWrapperProps): React.ReactNode {
    const syncedSettingKeys = props.viewContext.useSyncedSettingKeys();

    const syncHelper = React.useMemo(() => {
        return new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices, props.viewContext);
    }, [props.workbenchServices, syncedSettingKeys, props.viewContext]);

    const syncedVerticalScale = syncHelper.useValue(SyncSettingKey.VERTICAL_SCALE, "global.syncValue.verticalScale");

    const handleVerticalScaleChange = React.useCallback(
        function handleVerticalScaleChange(verticalScale: number) {
            syncHelper.publishValue(SyncSettingKey.VERTICAL_SCALE, "global.syncValue.verticalScale", verticalScale);
        },
        [syncHelper]
    );

    return (
        <HoverUpdateWrapper
            {...props}
            verticalScale={syncedVerticalScale ?? undefined}
            onVerticalScaleChange={handleVerticalScaleChange}
        />
    );
}
