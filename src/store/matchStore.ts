import { create } from 'zustand';
import { Match, MatchState } from '../types';
import { supabase, fetchMatches } from '../supabase';

interface MatchStore extends MatchState {
    addMatch: (match: Match) => void;
    removeMatch: (matchId: string) => void;
    setMatches: (matches: Match[]) => void;
    setLoading: (loading: boolean) => void;
    loadMatches: () => Promise<void>;
}

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

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                set({ matches: [], isLoading: false });
                return;
            }

            const matches = await fetchMatches(user.id);
            set({ matches: matches as any, isLoading: false });
        } catch (error) {
            console.error('Error loading matches:', error);
            set({ isLoading: false });
        }
    },
}));
