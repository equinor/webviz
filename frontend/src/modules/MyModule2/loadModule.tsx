import { ModuleRegistry } from "@framework/ModuleRegistry";
import { Input } from "@lib/components/Input";

import { State } from "./state";

const defaultState: State = {
    text: "Hello World",
};

const module = ModuleRegistry.initModule<State>("MyModule2", defaultState);

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
