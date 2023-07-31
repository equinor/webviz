import { ModuleFCProps } from "@framework/Module";
import { Button } from "@lib/components/Button";
import { Slider } from "@lib/components/Slider";

import { State } from "./state";

export const settings = (props: ModuleFCProps<State>) => {
    const setCount = props.moduleContext.useSetStoreValue("count");

    return (
        <div className="h-96">
            <Button onClick={() => setCount((prev: number) => prev + 1)}>Count</Button>
            <Slider
                value={[1, 2]}
                min={0}
                max={10}
                step={2}
                valueLabelFormat={(value, index) => `number ${value}`}
                valueLabelDisplay="auto"
                marks={true}
                orientation="vertical"
                style={{ height: 200 }}
            />
        </div>
    );
};
