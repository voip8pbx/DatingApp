import { create } from 'zustand';
import { Profile, AuthState } from '../types';
import { supabase } from '../supabase';

interface AuthStore extends AuthState {
    setUser: (user: Profile | null) => void;
    setSession: (session: any | null) => void;
    setLoading: (loading: boolean) => void;
    logout: () => void;
    initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,

    setUser: (user) => set({ user, isAuthenticated: !!user }),

    setSession: (session) => set({ session }),

    setLoading: (isLoading) => set({ isLoading }),

    logout: () => set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
    }),

    initializeAuth: async () => {
        set({ isLoading: true });

        const fetchAndSetProfile = async (sessionUser: any) => {
            if (sessionUser) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', sessionUser.id)
                    .single();
                
                if (data) {
                    set({ user: data, isAuthenticated: true, isLoading: false });
                } else {
                    // User is authenticated but hasn't completed profile setup
                    set({ user: sessionUser as any, isAuthenticated: true, isLoading: false });
                }
            } else {
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        };
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        set({ session });
        await fetchAndSetProfile(session?.user);

        // Listen for changes
        supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
            set({ session, isLoading: true });
            await fetchAndSetProfile(session?.user);
        });
    },
}));
