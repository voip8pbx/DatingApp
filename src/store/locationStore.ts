import { create } from 'zustand';
import type { MatchedUserLocation } from '../types';

interface LocationStore {
    // Current user
    currentLocation: { latitude: number; longitude: number; heading?: number } | null;
    permissionStatus: 'unknown' | 'granted' | 'denied';
    isTracking: boolean;

    // Matched users
    matchedLocations: MatchedUserLocation[];

    // Actions
    setCurrentLocation: (loc: { latitude: number; longitude: number; heading?: number } | null) => void;
    setPermissionStatus: (status: 'unknown' | 'granted' | 'denied') => void;
    setIsTracking: (v: boolean) => void;
    upsertMatchedLocation: (loc: MatchedUserLocation) => void;
    removeMatchedLocation: (userId: string) => void;
    setMatchedLocations: (locs: MatchedUserLocation[]) => void;
    clearMatchedLocations: () => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
    // Initial state
    currentLocation: null,
    permissionStatus: 'unknown',
    isTracking: false,
    matchedLocations: [],

    // Actions
    setCurrentLocation: (loc) => set({ currentLocation: loc }),

    setPermissionStatus: (status) => set({ permissionStatus: status }),

    setIsTracking: (v) => set({ isTracking: v }),

    upsertMatchedLocation: (loc) => set((state) => {
        const existingIndex = state.matchedLocations.findIndex(
            (l) => l.user_id === loc.user_id
        );

        if (existingIndex >= 0) {
            // Update existing location
            const newLocations = [...state.matchedLocations];
            newLocations[existingIndex] = loc;
            return { matchedLocations: newLocations };
        } else {
            // Add new location
            return { matchedLocations: [...state.matchedLocations, loc] };
        }
    }),

    removeMatchedLocation: (userId) => set((state) => ({
        matchedLocations: state.matchedLocations.filter((l) => l.user_id !== userId)
    })),

    setMatchedLocations: (locs) => set({ matchedLocations: locs }),

    clearMatchedLocations: () => set({ matchedLocations: [] }),
}));

export default useLocationStore;
