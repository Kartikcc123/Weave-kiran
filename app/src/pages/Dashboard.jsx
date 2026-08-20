import React from 'react';
import LiveInspection from '../components/LiveInspection';
import ProductionStatus from '../components/ProductionStatus';
import DefectSummary from '../components/DefectSummary';
import RecentDefects from '../components/RecentDefects';

export default function Dashboard() {
  return (
    <div className="h-full p-4 flex flex-col gap-4 bg-[#F7F7F7] min-h-0">
      {/* Top Row: Live Inspection (Large) + Production Status (Small) */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-3/4 flex flex-col min-h-0">
          <LiveInspection />
        </div>
        <div className="w-1/4 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0">
            <ProductionStatus />
          </div>
          <div className="flex-1 min-h-0">
            <DefectSummary />
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Defects */}
      <div className="h-[25vh] min-h-[150px] flex-shrink-0">
        <RecentDefects />
      </div>
    </div>
  );
}
