import { AuthenticationBoundary } from "@framework/internal/components/AuthenticationBoundary";
import "./modules/registerAllModules";
import "./templates/registerAllTemplates";

import { WorkbenchWrapper } from "./WorkbenchWrapper";

function App() {
    return (
        <div className="bg-gray-100">
            <AuthenticationBoundary>
                <WorkbenchWrapper />
            </AuthenticationBoundary>
        </div>
    );
}

export default App;
