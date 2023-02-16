import { ModuleFCProps } from "@framework/Module";
import { Input } from "@lib/components/Input";

import { State } from "./state";

export const settings = (props: ModuleFCProps<State>) => {
    const [exponent, setExponent] = props.moduleContext.useStoreState("exponent");

    return (
        <div>
            <label htmlFor="exponent">Exponent</label>
            <Input id="exponent" value={exponent} onChange={(e) => setExponent(Number(e.target.value))} type="number" />
        </div>
    );
};
