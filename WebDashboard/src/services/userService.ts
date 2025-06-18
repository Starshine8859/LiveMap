import { User, ActivityLog } from "../types/User";

// Mock user data
const mockUsers: User[] = [];

export class UserService {
  private users: User[] = [...mockUsers];
  private subscribers: ((users: User[]) => void)[] = [];

  constructor() {
    // Simulate real-time updates
    setInterval(() => {
      this.updateUserPositions();
    }, 5000);
  }

  subscribe(callback: (users: User[]) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== callback);
    };
  }

  private async updateUserPositions() {
    await fetch("http://192.168.10.185:3000/api/latest-status")
      .then((res) => res.json())
      .then((response) => {
        if (response.success) {
          const users = response.data.map((user) => ({
            id: user.userid,
            name: user.userid,
            email: user.userid,
            avatar:
              "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1",
            position: {
              lat: parseFloat(user.latitude),
              lng: parseFloat(user.longitude),
            },
            activity: user.status,
            speed: parseFloat(user.speed),
            lastSeen: new Date(user.timestamp),
            isOnline:
              Math.floor(
                (new Date().getTime() - new Date(user.timestamp).getTime()) /
                  60000
              ) < 5, // true if last seen within 5 minutes
            batteryLevel: Math.random() * 100,
          }));

          // Update the internal users array with the new data
          this.users = [...users]; // ✅ Fix here

          // Notify all subscribers with updated users list
          this.subscribers.forEach((callback) => callback([...this.users]));
        }
      })
      .catch((error) => {
        console.error("Failed to fetch user locations:", error);
      });
  }

  getUsers(): User[] {
    return [...this.users];
  }

  filterUsers(searchTerm: string, activityFilter: string, onlineFilter : string): User[] {
    return this.users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesActivity =
        activityFilter === "all" || user.activity === activityFilter;
      const onlineActivity =
        onlineFilter === "all" || user.isOnline === (onlineFilter==='Online');
      return matchesSearch && matchesActivity && onlineActivity;
    });
  }
}

export const userService = new UserService();
