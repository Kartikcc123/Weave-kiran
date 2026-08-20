import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { API_BASE_URL } from '../config';

export default function LiveInspection() {
  const { wsStatus, currentDefect } = useSimulation();

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] border border-[#E5E5E5] rounded p-1">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 bg-[#F7F7F7] border-b border-[#E5E5E5]">
        <h2 className="text-sm font-bold text-[#111111]">LIVE INSPECTION</h2>
        <div className="flex items-center gap-1.5">
          {wsStatus === 'ONLINE' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-[#16A34A]"></span>
              <span className="text-xs font-bold text-[#16A34A]">AI ENGINE ONLINE</span>
            </>
          ) : wsStatus === 'CONNECTING' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-[#D97706] animate-pulse"></span>
              <span className="text-xs font-bold text-[#D97706]">CONNECTING...</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-[#DC2626]"></span>
              <span className="text-xs font-bold text-[#DC2626]">DATA CONNECTION LOST</span>
            </>
          )}
        </div>
      </div>

      {/* Camera Area */}
      <div className="flex-1 relative bg-[#111111] overflow-hidden flex items-center justify-center">
        
        {wsStatus === 'ONLINE' ? (
          <img 
            src={`${API_BASE_URL}/video`} 
            alt="Live Fabric Feed"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        {/* Fallback for when video fails or offline */}
        <div className="absolute inset-0 bg-[#F7F7F7] flex flex-col items-center justify-center" style={{ display: wsStatus === 'ONLINE' ? 'none' : 'flex' }}>
          <div className="absolute inset-0 opacity-10" style={{ 
            backgroundImage: 'radial-gradient(#111 1px, transparent 1px)',
            backgroundSize: '10px 10px'
          }}></div>
          
          <div className="bg-[#FFFFFF] border border-[#E5E5E5] p-4 text-center z-10 rounded">
            <h3 className="font-bold text-[#111111] mb-1">CAMERA OFFLINE</h3>
            <p className="text-xs text-[#666666]">Waiting for backend video stream...</p>
          </div>
        </div>

        {/* CURRENT DEFECT OVERLAY */}
        {wsStatus === 'ONLINE' && (
          <div className="absolute top-4 left-4 z-20">
            {currentDefect ? (
              <div className="bg-[#FFFFFF] border-2 border-[#DC2626] p-2 shadow-sm min-w-[150px]">
                <div className="text-[10px] font-bold text-[#DC2626] uppercase mb-1">CURRENT DEFECT</div>
                <div className="text-lg font-bold text-[#111111] uppercase leading-none">{currentDefect.type}</div>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-sm font-bold text-[#666666]">{(currentDefect.confidence * 100).toFixed(0)}%</span>
                  <span className={`text-xs font-bold ${currentDefect.severity === 'HIGH' ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>
                    {currentDefect.severity}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#FFFFFF] border-2 border-[#16A34A] p-2 shadow-sm min-w-[150px]">
                <div className="text-[10px] font-bold text-[#16A34A] uppercase mb-1">CURRENT STATUS</div>
                <div className="text-sm font-bold text-[#111111]">NO DEFECT DETECTED</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
