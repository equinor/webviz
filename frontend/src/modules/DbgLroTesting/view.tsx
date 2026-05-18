import React from "react";

import type { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ContentError, ContentInfo } from "@modules/_shared/components/ContentMessage";

import type { Interfaces } from "./interfaces";

export function DbgLroTestingView(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const displayableData = props.viewContext.useSettingsToViewInterfaceValue("displayableData");

    const statusWriter = useViewStatusWriter(props.viewContext);

    const theText = displayableData ? displayableData.infoString : "N/A";

    return (
        <div className="relative w-full h-full flex flex-col">
            <ContentInfo>My text: {theText}</ContentInfo>
        </div>
    );
}
