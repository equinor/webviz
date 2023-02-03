import { ModuleRegistry } from "@/core/framework/ModuleRegistry";
import { Input } from "@/lib/components/Input";

import { State } from "./state";

const module = ModuleRegistry.getModule<State>("MyModule2");

module.viewFC = (props) => {
    const text = props.moduleContext.useStoreValue("text");

    return (
        <div>
            <h1>Text: {text as string}</h1>
        </div>
    );
};

module.settingsFC = (props) => {
    const [text, setText] = props.moduleContext.useStoreState("text");

    return (
        <div>
            <Input value={text} onChange={(e) => setText(e.target.value)} />
        </div>
    );
};
