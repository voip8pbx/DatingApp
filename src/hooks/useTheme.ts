import { useThemeStore } from '../store';
import { darkTheme, lightTheme, Theme } from '../theme';

export const useTheme = (): Theme => {
    const isDark = useThemeStore((state) => state.isDark);
    return isDark ? darkTheme : lightTheme;
};

export const useIsDark = (): boolean => {
    return useThemeStore((state) => state.isDark);
};

export const useToggleTheme = (): (() => void) => {
    return useThemeStore((state) => state.toggleTheme);
};
