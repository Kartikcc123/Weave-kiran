import React from 'react';
import { useSimulation } from '../context/SimulationContext';

export default function DefectSummary() {
  const { stats } = useSimulation();

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded p-1 flex flex-col h-full min-h-0">
      <div className="px-4 py-2 bg-[#F7F7F7] border-b border-[#E5E5E5] flex-shrink-0">
        <h2 className="text-sm font-bold text-[#111111]">TODAY'S DEFECT SUMMARY</h2>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto min-h-0">
        {/* Simple Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-[#E5E5E5] p-3 text-center">
            <div className="text-2xl font-bold text-[#111111]">{stats.totalDefects}</div>
            <div className="text-xs text-[#666666] uppercase mt-1">Total Defects</div>
          </div>
          <div className="border border-[#E5E5E5] p-3 text-center bg-[#DC2626]/5">
            <div className="text-2xl font-bold text-[#DC2626]">{stats.majorDefects}</div>
            <div className="text-xs text-[#666666] uppercase mt-1">Major Defects</div>
          </div>
          <div className="border border-[#E5E5E5] p-3 text-center">
            <div className="text-2xl font-bold text-[#111111]">—</div>
            <div className="text-xs text-[#666666] uppercase mt-1">Quality Score</div>
          </div>
          <div className="border border-[#E5E5E5] p-3 text-center">
            <div className="text-2xl font-bold text-[#111111]">—</div>
            <div className="text-xs text-[#666666] uppercase mt-1">Defects / 100m</div>
          </div>
        </div>

        {/* Very simple horizontal bar chart */}
        <div className="flex-1 flex flex-col gap-2">
          <h3 className="text-xs font-bold text-[#666666] uppercase mb-2">Defect Distribution</h3>
          {Object.entries(stats.defectCounts).map(([typeName, count], i) => {
            // Find max for scaling
            const max = Math.max(...Object.values(stats.defectCounts), 1);
            const percentage = (count / max) * 100;
            return (
              <div key={i} className="flex items-center text-sm">
                <div className="w-20 text-[#666666] truncate">{typeName}</div>
                <div className="flex-1 h-5 bg-[#F7F7F7] border border-[#E5E5E5] mx-2 relative">
                  <div 
                    className="absolute top-0 left-0 h-full bg-[#111111] transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="w-8 text-right font-bold text-[#111111]">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
