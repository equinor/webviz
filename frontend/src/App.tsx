import { Content } from "@core/components/Content";
import { Settings } from "@core/components/Settings";
import { TopNavBar } from "@core/components/TopNavBar";

function App() {
    return (
        <div className="h-screen flex flex-row">
            <Settings />
            <div className="flex flex-col flex-grow">
                <TopNavBar />
                <Content />
            </div>
        </div>
    );
}

export default App;
