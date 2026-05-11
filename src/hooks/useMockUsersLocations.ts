import { useEffect, useState } from 'react';
import type { MatchedUserLocation } from '../types';

// Base location for DDA Park - Moti Nagar
const DDA_PARK_BASE = {
  latitude: 28.662,
  longitude: 77.141,
};

const MOCK_USERS: Omit<
  MatchedUserLocation,
  'latitude' | 'longitude' | 'updated_at'
>[] = [
  {
    user_id: 'mock-user-1',
    profile: {
      full_name: 'Alice Johnson',
      avatar_url: 'https://i.pravatar.cc/150?img=1',
      last_active: new Date().toISOString(),
    },
    isOnline: true,
  },
  {
    user_id: 'mock-user-2',
    profile: {
      full_name: 'Bob Smith',
      avatar_url: 'https://i.pravatar.cc/150?img=2',
      last_active: new Date().toISOString(),
    },
    isOnline: true,
  },
  {
    user_id: 'mock-user-3',
    profile: {
      full_name: 'Charlie Brown',
      avatar_url: 'https://i.pravatar.cc/150?img=3',
      last_active: new Date().toISOString(),
    },
    isOnline: true,
  },
  {
    user_id: 'mock-user-4',
    profile: {
      full_name: 'Diana Prince',
      avatar_url: 'https://i.pravatar.cc/150?img=4',
      last_active: new Date().toISOString(),
    },
    isOnline: true,
  },
  {
    user_id: 'mock-user-5',
    profile: {
      full_name: 'Eve Wilson',
      avatar_url: 'https://i.pravatar.cc/150?img=5',
      last_active: new Date().toISOString(),
    },
    isOnline: true,
  },
];

export const useMockUsersLocations = () => {
  const [mockLocations, setMockLocations] = useState<MatchedUserLocation[]>([]);

  useEffect(() => {
    // Initialize mock users with random positions around DDA Park
    const initialLocations: MatchedUserLocation[] = MOCK_USERS.map(user => ({
      ...user,
      latitude: DDA_PARK_BASE.latitude + (Math.random() - 0.5) * 0.001,
      longitude: DDA_PARK_BASE.longitude + (Math.random() - 0.5) * 0.001,
      updated_at: new Date().toISOString(),
    }));

    setMockLocations(initialLocations);

    // Simulate movement every 2.5 seconds
    const interval = setInterval(() => {
      setMockLocations(currentLocations =>
        currentLocations.map(user => {
          const latChange = (Math.random() - 0.5) * 0.0002;
          const lngChange = (Math.random() - 0.5) * 0.0002;

          // Keep users within park bounds (~100m x 100m area)
          const newLat = Math.max(
            DDA_PARK_BASE.latitude - 0.0005,
            Math.min(
              DDA_PARK_BASE.latitude + 0.0005,
              user.latitude + latChange,
            ),
          );
          const newLng = Math.max(
            DDA_PARK_BASE.longitude - 0.0005,
            Math.min(
              DDA_PARK_BASE.longitude + 0.0005,
              user.longitude + lngChange,
            ),
          );

          return {
            ...user,
            latitude: newLat,
            longitude: newLng,
            updated_at: new Date().toISOString(),
          };
        }),
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return mockLocations;
};

export default useMockUsersLocations;
