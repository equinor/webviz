import React from "react";

import { UserInfo } from "@api";
import { apiService } from "@framework/ApiService";

import { createGenericContext } from "../utils/generic-context";

export enum AuthState {
    LoggedIn = "LoggedIn",
    NotLoggedIn = "NotLoggedIn",
    Loading = "Loading",
}

type Context = {
    authState: AuthState;
    userInfo: UserInfo | null;
    setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
};

const [useAuthContextProvider, AuthContextProvider] = createGenericContext<Context>();

export const AuthProvider: React.FC<{ children: React.ReactElement }> = (props) => {
    const [authState, setAuthState] = React.useState<AuthState>(AuthState.NotLoggedIn);
    const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null);

    React.useEffect(() => {
        if (!apiService) {
            return;
        }

        apiService.default
            .loggedInUser()
            .then((user) => {
                if (user) {
                    setAuthState(AuthState.LoggedIn);
                    setUserInfo(user);
                } else {
                    setAuthState(AuthState.NotLoggedIn);
                }
            })
            .catch(() => {
                setAuthState(AuthState.NotLoggedIn);
            });
    }, []);

    return <AuthContextProvider value={{ authState, userInfo, setAuthState }}>{props.children}</AuthContextProvider>;
};

export function useAuthProvider(): Context {
    return useAuthContextProvider();
}
