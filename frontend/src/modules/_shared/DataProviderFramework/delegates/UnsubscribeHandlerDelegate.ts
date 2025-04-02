/*
 * This class is used to manage the unsubscribe functions of the subscriptions
 * of the class instances related to the layers.
 *
 * It provides a method for registering one ore more unsubscribe function for a specific
 * topic and two methods for unsubscribing from a specific topic or from all topics, respectively.
 */
export class UnsubscribeHandlerDelegate {
    private _subscriptions: Map<string, Set<() => void>> = new Map();

    registerUnsubscribeFunction(topic: string, callback: () => void): void {
        let subscriptionsSet = this._subscriptions.get(topic);
        if (!subscriptionsSet) {
            subscriptionsSet = new Set();
            this._subscriptions.set(topic, subscriptionsSet);
        }
        subscriptionsSet.add(callback);
    }

    unsubscribe(topic: string): void {
        const subscriptionsSet = this._subscriptions.get(topic);
        if (subscriptionsSet) {
            for (const unsubscribeFunc of subscriptionsSet) {
                unsubscribeFunc();
            }
            this._subscriptions.delete(topic);
        }
    }

    unsubscribeAll(): void {
        for (const subscriptionsSet of this._subscriptions.values()) {
            for (const unsubscribeFunc of subscriptionsSet) {
                unsubscribeFunc();
            }
        }
    }
}
