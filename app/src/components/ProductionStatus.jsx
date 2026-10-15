import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';

export default function ProductionStatus() {
  const { backendStatus, production } = useSimulation();
  
  // Calculate inspection runtime
  const [runtimeStr, setRuntimeStr] = useState("00:00:00");
  
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      setRuntimeStr(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded p-1 flex flex-col h-full min-h-0">
      <div className="px-4 py-2 bg-[#F7F7F7] border-b border-[#E5E5E5] flex-shrink-0">
        <h2 className="text-sm font-bold text-[#111111]">CURRENT PRODUCTION STATUS</h2>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between text-sm overflow-y-auto min-h-0">
        <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
          <span className="text-[#666666]">Loom:</span>
          <span className="font-bold text-[#111111]">{backendStatus?.loom_id || 'LOOM-01'}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
          <span className="text-[#666666]">Status:</span>
          {backendStatus?.status === 'running' ? (
             <span className="font-bold text-[#16A34A]">RUNNING</span>
          ) : (
             <span className="font-bold text-[#DC2626]">OFFLINE</span>
          )}
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
          <span className="text-[#666666]">Arduino:</span>
          {production?.arduino_connected ? (
             <span className="font-bold text-[#16A34A]">CONNECTED</span>
          ) : (
             <span className="font-bold text-[#DC2626]">NOT CONNECTED</span>
          )}
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
          <span className="text-[#666666]">Fabric Speed:</span>
          {production?.fabric_speed != null ? (
             <span className="font-bold text-[#111111]">{production.fabric_speed.toFixed(2)} m/min</span>
          ) : (
             <span className="font-bold text-[#666666]">—</span>
          )}
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
          <span className="text-[#666666]">Fabric Inspected:</span>
          {production?.fabric_inspected != null ? (
             <span className="font-bold text-[#111111]">{production.fabric_inspected.toFixed(2)} m</span>
          ) : (
             <span className="font-bold text-[#666666]">Not available</span>
          )}
        </div>
        <div className="flex justify-between items-center py-2 border-b border-[#E5E5E5]">
          <span className="text-[#666666]">Current Roll:</span>
          <span className="font-bold text-[#111111]">{backendStatus?.roll_id || '—'}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-[#666666]">Inspection Time:</span>
          <span className="font-bold text-[#111111] font-mono">{runtimeStr}</span>
        </div>
      </div>
    </div>
  );
}
