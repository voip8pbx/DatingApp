import { create } from 'zustand';
import { Profile, SwipeState, FilterPreferences, SwipeDirection, Match } from '../types';
import { Config } from '../constants/Config';
import { supabase } from '../supabase';

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
        const { profiles, isLoading, hasMore } = get();
        if (isLoading || !hasMore) return;

        set({ isLoading: true });

        try {
            const page = Math.floor(profiles.length / 10) + 1;
            const response = await fetch(`${Config.API_URL}/api/profiles/discover?page=${page}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                }
            });

            const data = await response.json();

            if (data.profiles && data.profiles.length > 0) {
                set((state) => ({
                    profiles: [...state.profiles, ...data.profiles],
                    isLoading: false,
                    hasMore: data.profiles.length === 10,
                }));
            } else {
                set({ isLoading: false, hasMore: false });
            }
        } catch (error) {
            console.error('Error loading profiles:', error);
            set({ isLoading: false, hasMore: false });
        }
    },

    recordSwipe: async (profileId, direction) => {
        const { addSwipedProfile } = get();
        addSwipedProfile(profileId);

        try {
            const response = await fetch(`${Config.API_URL}/api/swipes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    swiped_id: profileId,
                    direction: direction
                })
            });

            const data = await response.json();
            return { matched: data.matched || false, matchId: data.matchId };
        } catch (error) {
            console.error('Error recording swipe:', error);
            return { matched: false };
        }
    },

    reset: () => set({
        profiles: [],
        currentIndex: 0,
        swipedProfiles: [],
        hasMore: true,
    }),
}));
