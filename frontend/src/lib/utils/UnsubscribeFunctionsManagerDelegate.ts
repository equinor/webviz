/*
 * This class is used to manage unsubscribe functions.
 *
 * It provides a method for registering unsubscribe functions for a given
 * category and two methods for unsubscribing from a given category or from all topics, respectively.
 */
export class UnsubscribeFunctionsManagerDelegate {
    private _categoryToUnsubscribeFunctionsMap: Map<string, Set<() => void>> = new Map();

    registerUnsubscribeFunction(topic: string, callback: () => void): void {
        let subscriptionsSet = this._categoryToUnsubscribeFunctionsMap.get(topic);
        if (!subscriptionsSet) {
            subscriptionsSet = new Set();
            this._categoryToUnsubscribeFunctionsMap.set(topic, subscriptionsSet);
        }
        subscriptionsSet.add(callback);
    }

    unsubscribe(topic: string): void {
        const subscriptionsSet = this._categoryToUnsubscribeFunctionsMap.get(topic);
        if (subscriptionsSet) {
            for (const unsubscribeFunc of subscriptionsSet) {
                unsubscribeFunc();
            }
            this._categoryToUnsubscribeFunctionsMap.delete(topic);
        }
    }

    unsubscribeAll(): void {
        for (const subscriptionsSet of this._categoryToUnsubscribeFunctionsMap.values()) {
            for (const unsubscribeFunc of subscriptionsSet) {
                unsubscribeFunc();
            }
        }
    }
}
