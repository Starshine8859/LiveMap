export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  position: {
    lat: number;
    lng: number;
  };
  activity: 'Still' | 'Walking' | 'Running' | 'Bicycling' | 'Driving' | 'On Foot' | 'Idle';
  speed: number; // m/s
  lastSeen: Date;
  isOnline: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  activity: 'Still' | 'Walking' | 'Running' | 'Bicycling' | 'Driving' | 'On Foot' | 'Idle';
  position: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
  speed: number;
}