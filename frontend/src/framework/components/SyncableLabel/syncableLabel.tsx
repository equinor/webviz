import React from "react";

import { ModuleContext } from "@framework/ModuleContext";
import { SyncSettingKey } from "@framework/SyncSettings";
import { LinkIcon } from "@heroicons/react/20/solid";
import { Label, LabelProps } from "@lib/components/Label";
import { Switch } from "@lib/components/Switch";
import { resolveClassNames } from "@lib/components/_utils/resolveClassNames";

export type SyncableLabelProps = {
    moduleContext: ModuleContext<any>;
    syncSettingKey: SyncSettingKey;
} & Omit<LabelProps, "startComponent" | "endComponent">;

export const SyncableLabel: React.FC<SyncableLabelProps> = (props) => {
    const { moduleContext, syncSettingKey, ...rest } = props;

    const handleSyncSettingChange = (setting: SyncSettingKey, value: boolean) => {
        if (value) {
            moduleContext.addSyncedSetting(setting);
        } else {
            moduleContext.removeSyncedSetting(setting);
        }
    };

    return (
        <Label
            {...rest}
            endComponent={
                <>
                    <span className="flex-grow" />
                    <Switch
                        condensed
                        checked={moduleContext.isSyncedSetting(syncSettingKey)}
                        onChange={(e) => handleSyncSettingChange(syncSettingKey, e.target.checked)}
                        title={
                            moduleContext.isSyncedSetting(syncSettingKey)
                                ? `Unsync "${props.text}"`
                                : `Sync "${props.text}"`
                        }
                    />
                    <LinkIcon
                        className={resolveClassNames(
                            "w-4 h-4 -mt-1 cursor-pointer",
                            moduleContext.isSyncedSetting(syncSettingKey) ? "text-blue-600" : "text-slate-600"
                        )}
                        onClick={() =>
                            handleSyncSettingChange(syncSettingKey, !moduleContext.isSyncedSetting(syncSettingKey))
                        }
                        title={
                            moduleContext.isSyncedSetting(syncSettingKey)
                                ? `Unsync "${props.text}"`
                                : `Sync "${props.text}"`
                        }
                    />
                </>
            }
        />
    );
};
