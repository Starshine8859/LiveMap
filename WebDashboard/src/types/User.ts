export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  position: {
    lat: number;
    lng: number;
  };
  activity: 'Walking' | 'Driving' | 'Stationary';
  speed: number; // km/h
  lastSeen: Date;
  isOnline: boolean;
}

export interface ActivityLog {
  id: string;
  userId: string;
  activity: 'Walking' | 'Driving' | 'Stationary' | 'Running' | 'Biking';
  position: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
  speed: number;
}