import { ModuleFCProps } from "@framework/Module";
import { Input } from "@lib/components/Input";
import { Select } from "@lib/components/Select";

import { State } from "./state";

export const settings = (props: ModuleFCProps<State>) => {
    const [exponent, setExponent] = props.moduleContext.useStoreState("exponent");

    const values = [];
    for (let i = 0; i < 100; i++) {
        values.push({ value: i, label: i.toString() });
    }

    return (
        <>
            <label htmlFor="exponent">Exponent</label>
            <Input id="exponent" value={exponent} onChange={(e) => setExponent(Number(e.target.value))} type="number" />
            <Select label="Scale" options={values} value="linear" size={10} filter multiple />
        </>
    );
};
