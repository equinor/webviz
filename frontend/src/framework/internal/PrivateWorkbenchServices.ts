import type { Workbench } from "../Workbench";
import type { NavigatorTopicDefinitions, TopicDefinitionsType } from "../WorkbenchServices";
import { WorkbenchServices } from "../WorkbenchServices";

export class PrivateWorkbenchServices extends WorkbenchServices {
    constructor(workbench: Workbench) {
        super(workbench);
    }

    publishNavigatorData<T extends keyof NavigatorTopicDefinitions>(topic: T, value: TopicDefinitionsType<T>) {
        this.internalPublishAnyTopic(topic, value);
    }
}
