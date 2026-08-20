import React from 'react';
import { useSimulation } from '../context/SimulationContext';

export default function RecentDefects() {
  const { recentDetections } = useSimulation();

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'HIGH': return 'text-[#DC2626] font-bold';
      case 'MEDIUM': return 'text-[#D97706] font-bold';
      case 'LOW': return 'text-[#666666]';
      default: return 'text-[#111111]';
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded p-1 flex flex-col h-full min-h-0">
      <div className="px-4 py-2 bg-[#F7F7F7] border-b border-[#E5E5E5] flex-shrink-0">
        <h2 className="text-sm font-bold text-[#111111]">RECENT DEFECTS</h2>
      </div>

      <div className="flex-1 overflow-auto bg-[#FFFFFF] min-h-0">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-xs text-[#666666] bg-[#F7F7F7] border-b border-[#E5E5E5] sticky top-0">
            <tr>
              <th className="px-4 py-2 font-bold border-r border-[#E5E5E5]">TIME</th>
              <th className="px-4 py-2 font-bold border-r border-[#E5E5E5]">DEFECT</th>
              <th className="px-4 py-2 font-bold border-r border-[#E5E5E5]">CONFIDENCE</th>
              <th className="px-4 py-2 font-bold border-r border-[#E5E5E5]">FABRIC POSITION</th>
              <th className="px-4 py-2 font-bold">SEVERITY</th>
            </tr>
          </thead>
          <tbody>
            {recentDetections.slice(0, 15).map((detection) => {
              const timeStr = new Date(detection.timestamp).toLocaleTimeString([], { hour12: false });
              
              return (
                <tr key={detection.id} className="border-b border-[#E5E5E5] hover:bg-[#F7F7F7]">
                  <td className="px-4 py-2 font-mono text-[#666666] border-r border-[#E5E5E5]">
                    {timeStr}
                  </td>
                  <td className={`px-4 py-2 border-r border-[#E5E5E5] ${getSeverityStyle(detection.severity)}`}>
                    {detection.type}
                  </td>
                  <td className="px-4 py-2 text-[#666666] border-r border-[#E5E5E5]">
                    {(detection.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-2 text-[#666666] border-r border-[#E5E5E5]">
                    {detection.fabricPosition}
                  </td>
                  <td className={`px-4 py-2 ${getSeverityStyle(detection.severity)}`}>
                    {detection.severity}
                  </td>
                </tr>
              );
            })}
            {recentDetections.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-[#666666]">
                  No recent defects recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
