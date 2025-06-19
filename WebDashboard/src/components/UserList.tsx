import React from "react";
import {
  Search,
  Filter,
  Wifi,
  User as UserIcon,
  MapPin,
  Clock,
} from "lucide-react";
import { User } from "../types/User";

interface UserListProps {
  users: User[];
  searchTerm: string;
  activityFilter: string;
  selectedUser: User | null;
  onlineFilter: string;

  onSearchChange: (term: string) => void;
  setActivityFilter: (filter: string) => void;
  setOnlineFilter: (filter: string) => void;
  onUserSelect: (user: User) => void;
}

export const UserList: React.FC<UserListProps> = ({
  users,
  searchTerm,
  activityFilter,
  selectedUser,
  onlineFilter,

  onSearchChange,
  setOnlineFilter,
  setActivityFilter,
  onUserSelect,
}) => {
  const getActivityColor = (activity: User["activity"]) => {
    switch (activity) {
      case "Walking":
        return "text-green-500 bg-green-100";
      case "Driving":
        return "text-blue-500 bg-blue-100";
      case "Idle":
        return "text-red-500 bg-red-100";
      default:
        return "text-gray-500 bg-gray-100";
    }
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="bg-gray-900 text-white w-80 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold mb-4">User Filter</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Activity Filter */}
        <div className="relative mb-4">
          <Wifi className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Status</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
          </select>
        </div>

        {/* Activity Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
          >
            <option value="all">All Activities</option>
            <option value="Idle">Idle</option>

            <option value="Walking">Walking</option>
            <option value="Running">Running</option>
            <option value="Biking">Biking</option>
            <option value="Driving">Driving</option>
            <option value="Train">Train</option>
          </select>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          { users.length === 0 ?(
            <div className="flex items-center justify-center h-40">
              <svg
                className="animate-spin h-6 w-6 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              <span className="ml-2 text-sm text-gray-400">Loading users...</span>
            </div>
          ) :(<>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-400">Active Users</span>
            <span className="text-sm text-green-500 font-medium">
              {users.filter((u) => u.isOnline).length} Online
            </span>
          </div>

          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                onClick={() => onUserSelect(user)}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                  selectedUser?.id === user.id
                    ? "bg-blue-600 shadow-lg"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                        user.isOnline ? "bg-green-500" : "bg-gray-500"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">{user.name}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getActivityColor(
                          user.activity
                        )}`}
                      >
                        {user.activity}
                      </span>
                    </div>

                    <p className="text-sm text-gray-400 truncate mb-2">
                      {user.email}
                    </p>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span>{user.speed.toFixed(1)} m/s</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </>)}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm font-medium text-green-500">
              {users.filter((u) => u.activity === "Walking").length}
            </div>
            <div className="text-xs text-gray-400">Walking</div>
          </div>
          <div>
            <div className="text-sm font-medium text-blue-500">
              {users.filter((u) => u.activity === "Driving").length}
            </div>
            <div className="text-xs text-gray-400">Driving</div>
          </div>
          <div>
            <div className="text-sm font-medium text-red-500">
              {users.filter((u) => u.activity === "Idle").length}
            </div>
            <div className="text-xs text-gray-400">Idle</div>
          </div>
        </div>
      </div>
    </div>
  );
};
