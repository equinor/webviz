import { ModuleViewProps } from "@framework/Module";

import InplaceVolumetricsTable from "./components/InplaceVolumetricsTable";
import { Interface } from "./settingsToViewInterface";
import { State } from "./state";

export function View(props: ModuleViewProps<State, Interface>) {
    const tmp = props.viewContext;

    return <InplaceVolumetricsTable inplaceVolumetricsDataset={[]} />;
}
