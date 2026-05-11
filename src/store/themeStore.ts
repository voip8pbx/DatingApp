import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeState } from '../types';

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            isDark: true,
            toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
