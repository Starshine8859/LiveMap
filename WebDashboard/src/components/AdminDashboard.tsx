import React, { useState, useEffect } from 'react';
import { LiveMap } from './LiveMap';
import { UserList } from './UserList';
import { User } from '../types/User';
import { userService } from '../services/userService';
import { RotateCcw, Maximize2, Settings } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlineFilter, setOnlineFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Initial load
    const initialUsers = userService.getUsers();
    console.log(initialUsers)
    setUsers(initialUsers);
    setFilteredUsers(initialUsers);

    // Subscribe to real-time updates
    const unsubscribe = userService.subscribe((updatedUsers) => {
      setUsers(updatedUsers);
      setLastUpdate(new Date());
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const filtered = userService.filterUsers(searchTerm, activityFilter, onlineFilter);
    setFilteredUsers(filtered);
  }, [users, searchTerm, activityFilter, onlineFilter]);

  const handleRefresh = () => {
    const refreshedUsers = userService.getUsers();
    setUsers(refreshedUsers);
    setLastUpdate(new Date());
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Sidebar - User List */}
      {!isFullscreen && (
        <UserList
          users={filteredUsers}
          searchTerm={searchTerm}
          activityFilter={activityFilter}
          selectedUser={selectedUser}
          onSearchChange={setSearchTerm}
          setOnlineFilter={setOnlineFilter}
          setActivityFilter={setActivityFilter}
          onUserSelect={setSelectedUser}
        />
      )}
      
      {/* Main Content - Map */}
      <div className="flex-1 relative">
        {/* Map Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex gap-2">
          <button
            onClick={handleRefresh}
            className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg shadow-lg border transition-colors duration-200 flex items-center gap-2"
            title="Refresh Data"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg shadow-lg border transition-colors duration-200 flex items-center gap-2"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </span>
          </button>
        </div>
        
        {/* Status Bar */}
        <div className="absolute top-4 left-4 z-[1000]">
          <div className="bg-white rounded-lg shadow-lg border p-4 min-w-[250px]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-900">Current Status</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600">Live</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Total Users</div>
                <div className="font-semibold text-gray-900">{users.length}</div>
              </div>
              <div>
                <div className="text-gray-600">Online</div>
                <div className="font-semibold text-green-600">
                  {users.filter(u => u.isOnline).length}
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-600">
                Last update: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Selected User Info */}
        {selectedUser && (
          <div className="absolute bottom-4 left-4 z-[1000]">
            <div className="bg-white rounded-lg shadow-lg border p-4 min-w-[280px]">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-600"></p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Activity</div>
                  <div className={`font-semibold capitalize ${
                    selectedUser.activity === 'Walking' ? 'text-green-600' :
                    selectedUser.activity === 'Driving' ? 'text-blue-600' :
                    'text-red-600'
                  }`}>
                    {selectedUser.activity}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Speed</div>
                  <div className="font-semibold text-gray-900">
                    {selectedUser.speed.toFixed(1)} m/s
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Status</div>
                  <div className={`font-semibold ${
                    selectedUser.isOnline ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {selectedUser.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600">
                  Position: {selectedUser.position.lat.toFixed(4)}, {selectedUser.position.lng.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Map */}
        <LiveMap
          users={filteredUsers}
          selectedUser={selectedUser}
          onUserSelect={setSelectedUser}
        />
      </div>
    </div>
  );
};