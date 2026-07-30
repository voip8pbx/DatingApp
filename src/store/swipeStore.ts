import { create } from 'zustand';
import { Profile, SwipeState, FilterPreferences, SwipeDirection, Match } from '../types';
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
        const { profiles, isLoading, hasMore, filters, swipedProfiles } = get();
        if (isLoading || !hasMore) return;

        set({ isLoading: true });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                set({ isLoading: false, hasMore: false });
                return;
            }

            const currentUserId = session.user.id;
            const PAGE_SIZE = 10;
            const offset = profiles.length;

            // Fetch already-swiped profile IDs from DB to exclude them
            const { data: swipedData } = await supabase
                .from('swipes')
                .select('swiped_id')
                .eq('swiper_id', currentUserId);

            const swipedIds = [
                currentUserId,
                ...swipedProfiles,
                ...(swipedData?.map((s: any) => s.swiped_id) ?? []),
            ];

            // Build query
            let query = supabase
                .from('profiles')
                .select('*')
                .not('id', 'in', `(${swipedIds.join(',')})`)
                .gte('age', filters.age_min)
                .lte('age', filters.age_max)
                .range(offset, offset + PAGE_SIZE - 1);

            // Gender filter
            if (filters.genders && filters.genders.length > 0) {
                query = query.in('gender', filters.genders);
            }

            const { data: newProfiles, error } = await query;

            if (error) {
                console.error('Error loading profiles from Supabase:', error);
                set({ isLoading: false, hasMore: false });
                return;
            }

            if (newProfiles && newProfiles.length > 0) {
                set((state) => ({
                    profiles: [...state.profiles, ...(newProfiles as Profile[])],
                    isLoading: false,
                    hasMore: newProfiles.length === PAGE_SIZE,
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
