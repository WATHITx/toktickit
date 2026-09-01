import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RequesterProvider } from "./context/RequesterContext";
import RequesterSelection from "./pages/RequesterSelection";
import SystemStatusWidget from "./components/SystemStatusWidget";

function App() {
  return (
    <RequesterProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RequesterSelection />} />
          <Route path="/system-status" element={<SystemStatusWidget />} />
          {/* /my-tickets, /create-ticket, /tickets/:id เพิ่มใน Issue ถัดไป */}
        </Routes>
      </BrowserRouter>
    </RequesterProvider>
  );
}

export default App;