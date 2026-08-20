import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import StatusBadge from './StatusBadge';
import DetectionModal from './DetectionModal';

export default function RecentDetections({ limit = 5 }) {
  const { recentDetections } = useSimulation();
  const [selectedDetection, setSelectedDetection] = useState(null);

  const displayData = recentDetections.slice(0, limit);

  return (
    <>
      <div className="glass-panel rounded-xl overflow-hidden h-full flex flex-col">
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Recent Detections</h2>
          <span className="text-xs text-gray-400">Live Updates</span>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 sticky top-0">
              <tr>
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-6 py-3 font-medium">Defect</th>
                <th className="px-6 py-3 font-medium">Confidence</th>
                <th className="px-6 py-3 font-medium">Severity</th>
                <th className="px-6 py-3 font-medium">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {displayData.map((detection) => (
                <tr 
                  key={detection.id} 
                  onClick={() => setSelectedDetection(detection)}
                  className="hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-mono text-xs">
                    {new Date(detection.timestamp).toLocaleTimeString([], { hour12: false })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-white">
                    {detection.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                    {(detection.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={detection.severity} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                    {detection.fabricPosition}m
                  </td>
                </tr>
              ))}
              
              {displayData.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No recent detections.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedDetection && (
        <DetectionModal 
          detection={selectedDetection} 
          onClose={() => setSelectedDetection(null)} 
        />
      )}
    </>
  );
}
