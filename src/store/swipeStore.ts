import { create } from 'zustand';
import { Profile, SwipeState, FilterPreferences, SwipeDirection, Match } from '../types';
import { mockProfiles, getRandomProfiles } from '../utils/mockData';

interface SwipeStore extends SwipeState {
    swipedProfiles: string[];
    setProfiles: (profiles: Profile[]) => void;
    addSwipedProfile: (profileId: string) => void;
    setFilters: (filters: FilterPreferences) => void;
    setLoading: (loading: boolean) => void;
    loadMoreProfiles: () => Promise<void>;
    recordSwipe: (profileId: string, direction: SwipeDirection) => Promise<{ matched: boolean; matchId?: string }>;
    reset: () => void;
}

const defaultFilters: FilterPreferences = {
    genders: ['male', 'female', 'non-binary', 'other'],
    age_min: 18,
    age_max: 35,
    max_distance: 50,
    interests: [],
};

export const useSwipeStore = create<SwipeStore>((set, get) => ({
    profiles: [],
    currentIndex: 0,
    filters: defaultFilters,
    isLoading: false,
    hasMore: true,
    swipedProfiles: [],

    setProfiles: (profiles) => set({ profiles }),

    addSwipedProfile: (profileId) => set((state) => ({
        swipedProfiles: [...state.swipedProfiles, profileId],
        currentIndex: state.currentIndex + 1,
    })),

    setFilters: (filters) => set({ filters }),

    setLoading: (isLoading) => set({ isLoading }),

    loadMoreProfiles: async () => {
        const { swipedProfiles, isLoading } = get();
        if (isLoading) return;

        set({ isLoading: true });

        // Simulate API delay
        await new Promise<void>((resolve) => { setTimeout(resolve, 500); });

        // In production, this would call the backend API
        // For now, use mock data excluding already swiped profiles
        const newProfiles = getRandomProfiles(10, swipedProfiles);

        set((state) => ({
            profiles: [...state.profiles, ...newProfiles],
            isLoading: false,
            hasMore: newProfiles.length > 0,
        }));
    },

    recordSwipe: async (profileId, direction) => {
        const { addSwipedProfile } = get();
        addSwipedProfile(profileId);

        // Simulate match detection (in production, this would be handled by backend)
        if (direction === 'like') {
            // 30% chance of match for demo purposes
            const isMatch = Math.random() < 0.3;
            if (isMatch) {
                return { matched: true, matchId: `match-${Date.now()}` };
            }
        }

        return { matched: false };
    },

    reset: () => set({
        profiles: [],
        currentIndex: 0,
        swipedProfiles: [],
        hasMore: true,
    }),
}));
