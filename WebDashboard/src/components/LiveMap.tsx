import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { User } from '../types/User';
import '../css/mark-animation.css';

interface LiveMapProps {
  users: User[];
  selectedUser: User | null;
  onUserSelect: (user: User) => void;
}

const createUserIcon = (user: User) => {
  const colors = {
    Walking: '#10B981',   // green
    Driving: '#3B82F6',   // blue
    Idle: '#EF4444'       // red
  };

  const color = colors[user.activity] || '#ff5100';
  const size = user.isOnline ? 16 : 12;
  const opacity = user.isOnline ? 1 : 0.6;

  let animationClass = '';
  if (user.activity === 'Idle') {
    animationClass = 'animated-marker-red';
  } else {
    animationClass = 'animated-marker';
  }

  return new DivIcon({
    html: `
      <div class="custom-marker ${animationClass}" style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        opacity: ${opacity};
        border-radius: 50%;
      "></div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

const MapUpdater: React.FC<{ users: User[]; selectedUser: User | null }> = ({ users, selectedUser }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedUser) {
      map.setView([selectedUser.position.lat, selectedUser.position.lng], 16, {
        animate: true,
        duration: 1
      });
    }
  }, [selectedUser, map]);

  return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({ users, selectedUser, onUserSelect }) => {
  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[40.7128, -74.006]}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* 💡 Dark themed OSM layer from Carto */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater users={users} selectedUser={selectedUser} />

        {users.map(user => (
          <Marker
            key={user.id}
            position={[user.position.lat, user.position.lng]}
            icon={createUserIcon(user)}
            eventHandlers={{
              click: () => onUserSelect(user)
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Activity:</span>
                    <span className={`font-medium capitalize ${
                      user.activity === 'Walking' ? 'text-green-600' :
                      user.activity === 'Driving' ? 'text-blue-600' :
                      'text-red-600'
                    }`}>
                      {user.activity}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Speed:</span>
                    <span className="font-medium">{user.speed.toFixed(1)} m/s</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${user.isOnline ? 'text-green-600' : 'text-gray-600'}`}>
                      {user.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
