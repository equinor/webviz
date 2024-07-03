import { ModuleViewProps } from "@framework/Module";
import { useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";

import { SettingsToViewInterface } from "../settingsToViewInterface";

export function View(props: ModuleViewProps<Record<string, never>, SettingsToViewInterface>): React.ReactNode {
    const filter = props.viewContext.useSettingsToViewInterfaceValue("filter");
    const resultName = props.viewContext.useSettingsToViewInterfaceValue("resultName");

    return <div>Soon there will be some convergence plots here...</div>;
}
