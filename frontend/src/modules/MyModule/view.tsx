import { ModuleFCProps } from "@framework/Module";

import { State } from "./state";

export const view = (props: ModuleFCProps<State>) => {
    const count = props.moduleContext.useStoreValue("count");

    const divScale = props.workbenchSettings.useDivergingColorScale({ divMidPoint: 50 });

    divScale.setMin(0);
    divScale.setMax(100);

    return (
        <div>
            <h3>Count: {count}</h3>
            <div className="w-40 h-12" style={{ backgroundColor: divScale.getColorForValue(count) }} />
        </div>
    );
};
