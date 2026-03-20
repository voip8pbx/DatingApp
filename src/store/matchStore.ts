import { create } from 'zustand';
import { Match, MatchState, Profile } from '../types';
import { mockProfiles } from '../utils/mockData';

interface MatchStore extends MatchState {
    addMatch: (match: Match) => void;
    removeMatch: (matchId: string) => void;
    setMatches: (matches: Match[]) => void;
    setLoading: (loading: boolean) => void;
    loadMatches: () => Promise<void>;
}

// Generate some initial mock matches
const generateMockMatches = (): Match[] => {
    const currentUserId = 'current-user';
    return mockProfiles.slice(0, 5).map((profile, index) => ({
        id: `match-${index + 1}`,
        user1_id: currentUserId,
        user2_id: profile.id,
        created_at: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
        is_active: true,
        other_user: profile,
    }));
};

export const useMatchStore = create<MatchStore>((set) => ({
    matches: [],
    isLoading: false,

    addMatch: (match) => set((state) => ({
        matches: [match, ...state.matches],
    })),

    removeMatch: (matchId) => set((state) => ({
        matches: state.matches.filter((m) => m.id !== matchId),
    })),

    setMatches: (matches) => set({ matches }),

    setLoading: (isLoading) => set({ isLoading }),

    loadMatches: async () => {
        set({ isLoading: true });

        // Simulate API delay
        await new Promise<void>((resolve) => { setTimeout(resolve, 500); });

        // Load mock matches
        const matches = generateMockMatches();
        set({ matches, isLoading: false });
    },
}));
