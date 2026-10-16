import type { UserInfo_api } from "@api";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import type { AuthState } from "./AuthStateStore";
import { AuthStateStore, AuthStateStoreTopic } from "./AuthStateStore";

export function useAuthState(): AuthState {
    return usePublishSubscribeTopicValue(AuthStateStore.getInstance(), AuthStateStoreTopic.AUTH_STATE);
}

export function useUserInfo(): UserInfo_api | null {
    return usePublishSubscribeTopicValue(AuthStateStore.getInstance(), AuthStateStoreTopic.USER_INFO);
}
