import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SimulationProvider } from './context/SimulationContext';
import Header from './components/Header';

// Pages
import Dashboard from './pages/Dashboard';
import LiveInspectionPage from './pages/LiveInspectionPage';
import ProductionPage from './pages/ProductionPage';

function App() {
  return (
    <SimulationProvider>
      <Router>
        <div className="flex flex-col h-screen bg-[#F7F7F7] text-[#111111] overflow-hidden font-sans">
          <Header />
          <main className="flex-1 overflow-hidden relative">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/live" element={<LiveInspectionPage />} />
              <Route path="/production" element={<ProductionPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SimulationProvider>
  );
}

export default App;
