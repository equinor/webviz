import React from "react";

import { UserInfo_api } from "@api";
import { apiService } from "@framework/ApiService";

export enum AuthState {
    LoggedIn = "LoggedIn",
    NotLoggedIn = "NotLoggedIn",
    Loading = "Loading",
}

type Context = {
    authState: AuthState;
    userInfo: UserInfo_api | null;
    setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
};

const createGenericContext = <T extends object>() => {
    // Create a context with a generic parameter or undefined
    const genericContext = React.createContext<T | undefined>(undefined);

    // Check if the value provided to the context is defined or throw an error
    const useGenericContext = () => {
        const contextIsDefined = React.useContext(genericContext);
        if (!contextIsDefined) {
            throw new Error("useGenericContext must be used within a Provider");
        }
        return contextIsDefined;
    };

    return [useGenericContext, genericContext.Provider] as const;
};

const [useAuthContextProvider, AuthContextProvider] = createGenericContext<Context>();

export const AuthProvider: React.FC<{ children: React.ReactElement }> = (props) => {
    const [authState, setAuthState] = React.useState<AuthState>(AuthState.Loading);
    const [userInfo, setUserInfo] = React.useState<UserInfo_api | null>(null);

    React.useEffect(() => {
        if (!apiService) {
            return;
        }

        apiService.default
            .loggedInUser(true)
            .then((user) => {
                if (user) {
                    setAuthState(AuthState.LoggedIn);
                    setUserInfo(user);
                } else {
                    setAuthState(AuthState.NotLoggedIn);
                }
            })
            .catch((err) => {
                console.warn(err);
                setAuthState(AuthState.NotLoggedIn);
            });
    }, []);

    return <AuthContextProvider value={{ authState, userInfo, setAuthState }}>{props.children}</AuthContextProvider>;
};

export function useAuthProvider(): Context {
    return useAuthContextProvider();
}
