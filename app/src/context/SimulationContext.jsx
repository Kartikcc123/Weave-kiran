import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { API_BASE_URL, WS_URL } from '../config';

const SimulationContext = createContext();

export function SimulationProvider({ children }) {
  // Session Stats
  const [stats, setStats] = useState({
    totalDefects: 0,
    majorDefects: 0,
    defectCounts: {}
  });
  
  // Production / Backend Status
  const [backendStatus, setBackendStatus] = useState(null);
  
  // Live Events
  const [recentDetections, setRecentDetections] = useState([]);
  const [currentDefect, setCurrentDefect] = useState(null);
  
  // Connection states
  const [wsStatus, setWsStatus] = useState('CONNECTING'); // CONNECTING, ONLINE, OFFLINE
  const wsRef = useRef(null);

  // 1. Fetch initial status & stats
  const fetchInitialData = async () => {
    try {
      const resStatus = await fetch(`${API_BASE_URL}/status`);
      if (resStatus.ok) {
        setBackendStatus(await resStatus.json());
      }
      
      const resStats = await fetch(`${API_BASE_URL}/stats`);
      if (resStats.ok) {
        const data = await resStats.json();
        setStats({
          totalDefects: data.total_defects,
          majorDefects: data.major_defects,
          defectCounts: data.defect_counts
        });
      }

      const resHistory = await fetch(`${API_BASE_URL}/api/defects?limit=50`);
      if (resHistory.ok) {
        const historyData = await resHistory.json();
        const mappedHistory = historyData.map(e => ({
          id: e.track_id, // For UI consistency
          event_id: e.event_id,
          timestamp: e.timestamp,
          type: e.defect_type,
          confidence: e.confidence,
          severity: e.severity,
          fabricPosition: '—'
        }));
        setRecentDetections(mappedHistory);
      }
    } catch (err) {
      console.error("Backend offline or inaccessible:", err);
    }
  };

  // 2. Manage WebSocket Connection
  useEffect(() => {
    fetchInitialData();
    
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      setWsStatus('CONNECTING');
      const ws = new WebSocket(`${WS_URL}/ws/detections`);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('ONLINE');
        console.log("[WS] Connected");
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.new_events && payload.new_events.length > 0) {
             console.log("[WS] New Defect Event received:", payload.new_events);
          }

          // Update stats from the payload
          if (payload.stats) {
            setStats(prev => {
              if (prev.totalDefects !== payload.stats.total_defects) {
                 console.log("[STATE] Defect count updated:", payload.stats.total_defects);
              }
              return {
                totalDefects: payload.stats.total_defects,
                majorDefects: payload.stats.major_defects,
                defectCounts: payload.stats.defect_counts
              };
            });
          }

          // Handle NEW events (adding brand new rows to recent detections)
          if (payload.new_events && payload.new_events.length > 0) {
            const timestampStr = payload.timestamp;
            
            const newRows = payload.new_events.map(e => ({
                id: e.track_id, // Use backend track_id for tracking
                event_id: e.event_id,
                timestamp: e.timestamp || timestampStr,
                type: e.defect_type || e.class_name, // e.defect_type is the new field
                confidence: e.confidence, // This is max_confidence from backend
                severity: e.severity,
                fabricPosition: '—'
            }));

            setRecentDetections(curr => {
              const updated = [...newRows, ...curr];
              return updated.slice(0, 50); // Keep last 50
            });
          }

          // Handle CURRENT events (updates max confidence of existing rows + Current Defect panel)
          if (payload.current_detections) {
             // 1. Update Existing Rows in Recent Defects
             if (payload.current_detections.length > 0) {
               setRecentDetections(curr => {
                  let changed = false;
                  const next = curr.map(row => {
                      const update = payload.current_detections.find(d => d.track_id === row.id);
                      if (update && update.confidence > row.confidence) {
                          changed = true;
                          return { ...row, confidence: update.confidence, severity: update.severity };
                      }
                      return row;
                  });
                  return changed ? next : curr;
               });
             }

             // 2. Update Current Defect Overlay
             if (payload.current_detections.length > 0) {
                // Find the one with highest confidence to show on screen
                const maxDet = payload.current_detections.reduce((prev, curr) => (prev.confidence > curr.confidence) ? prev : curr);
                
                if (maxDet && maxDet.class_name) {
                  setCurrentDefect({
                    type: maxDet.class_name,
                    confidence: maxDet.confidence,
                    severity: maxDet.severity
                  });
                } else {
                  console.warn("[WS] Current detection missing class_name:", maxDet);
                  setCurrentDefect(null);
                }
             } else {
                // If there are no current tracks active, remove the overlay
                setCurrentDefect(null);
             }
          }

        } catch (err) {
          console.error("WebSocket message parse error:", err);
        }
      };

      ws.onclose = () => {
        setWsStatus('OFFLINE');
        setCurrentDefect(null);
        // Attempt reconnect
        reconnectTimeout = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
      
      ws.onerror = (err) => {
        // Handled mostly by onclose
      };
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <SimulationContext.Provider value={{
      stats,
      backendStatus,
      recentDetections,
      currentDefect,
      wsStatus
    }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  return useContext(SimulationContext);
}
