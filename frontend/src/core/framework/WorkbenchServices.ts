import React from "react";


namespace TopicMap {
    export type Workbench = {
        FieldName: string;
        CaseId: string;
      }

    export type SharedData = {
          InfoMessage: string;
          Depth: number;
          Position: { x: number, y: number}
      }
} 


type TopicMapAll = TopicMap.Workbench & TopicMap.SharedData;



export class WorkbenchServices {
    private _subscribersMap: { [key: string]: Set<any> } = {}

    subscribe<T extends keyof TopicMapAll>(topic: T, cb: (value: TopicMapAll[T]) => void) {
        const subscribersSet = this._subscribersMap[topic] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[topic.toString()] = subscribersSet
        return () => {
            subscribersSet.delete(cb);
        }
    }

    publishSharedData<T extends keyof TopicMap.SharedData>(topic: T, value: TopicMap.SharedData[T]) {
        console.log(`PUB SHARED ${topic}=${value}`);
        const subscribersSet = this._subscribersMap[topic] || new Set();
        for (let cb of subscribersSet) {
            cb(value);
        }
    }

    internal_publishWorkbenchData<T extends keyof TopicMap.Workbench>(topic: T, value: TopicMap.Workbench[T]) {
      console.log(`PUB WORKBENCH ${topic}=${value}`);
      const subscribersSet = this._subscribersMap[topic] || new Set();
      for (let cb of subscribersSet) {
          cb(value);
      }
  }
}


export function useWorkbenchSubscribedValue<T extends keyof TopicMapAll>(topic: T, workbenchServices: WorkbenchServices): TopicMapAll[T] | null {
  const [latestValue, setLatestValue] = React.useState<TopicMapAll[T]|null>(null);

  React.useEffect(function subscribeToWorkbench() {
      function handleNewMessageFromWorkbench(newValue: TopicMapAll[T]) {
        setLatestValue(newValue);
      }
  
      const unsubscribeFunc = workbenchServices.subscribe(topic, handleNewMessageFromWorkbench)
      return unsubscribeFunc;
  }, [workbenchServices]);

  return latestValue;
}

