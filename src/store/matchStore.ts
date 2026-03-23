import { create } from 'zustand';
import { Match, MatchState } from '../types';
import { Config } from '../constants/Config';
import { supabase } from '../supabase';

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
            const response = await fetch(`${Config.API_URL}/api/matches`, {
                headers: {
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                }
            });

            const data = await response.json();

            if (Array.isArray(data)) {
                set({ matches: data, isLoading: false });
            } else {
                set({ matches: [], isLoading: false });
            }
        } catch (error) {
            console.error('Error loading matches:', error);
            set({ isLoading: false });
        }
    },
}));
