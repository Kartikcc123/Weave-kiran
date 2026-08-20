import React from 'react';
import { useSimulation } from '../context/SimulationContext';

export default function ProductionCard() {
  const { production } = useSimulation();

  if (!production) return <div className="glass-panel p-6 rounded-xl animate-pulse h-64"></div>;

  return (
    <div className="glass-panel p-6 rounded-xl flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">Production Status</h2>
        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
          {production.loomStatus}
        </div>
      </div>

      <div className="space-y-5 flex-1">
        <div className="flex justify-between items-center pb-3 border-b border-gray-800">
          <span className="text-gray-400 text-sm">Fabric Speed</span>
          <span className="text-white font-medium">{production.fabricSpeed.toFixed(1)} m/min</span>
        </div>
        
        <div className="flex justify-between items-center pb-3 border-b border-gray-800">
          <span className="text-gray-400 text-sm">Fabric Inspected</span>
          <span className="text-white font-medium">{production.fabricInspected.toFixed(1)} m</span>
        </div>

        <div className="flex justify-between items-center pb-3 border-b border-gray-800">
          <span className="text-gray-400 text-sm">Inspection Runtime</span>
          <span className="text-white font-medium font-mono">{production.inspectionRuntime}</span>
        </div>

        <div className="flex justify-between items-center pb-3 border-b border-gray-800">
          <span className="text-gray-400 text-sm">Defects / 100m</span>
          <span className="text-amber-500 font-medium">{production.defectsPer100m.toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Current Roll: <span className="text-gray-300">{production.currentRoll}</span></span>
          <span className="text-xs font-medium text-white">{production.rollProgress}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${production.rollProgress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
