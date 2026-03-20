import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const darkTheme = {
    colors: {
        background: '#0A0A0F',
        surface: '#13131A',
        surfaceElevated: '#1C1C28',
        primary: '#FF3CAC',
        secondary: '#784BA0',
        accent: '#2B86C5',
        gradient: ['#FF3CAC', '#784BA0', '#2B86C5'] as string[],
        gradientStart: '#FF3CAC',
        gradientMiddle: '#784BA0',
        gradientEnd: '#2B86C5',
        text: '#FFFFFF',
        textSecondary: '#A0A0B0',
        textMuted: '#5A5A7A',
        border: '#2A2A3A',
        like: '#00E5A0',
        dislike: '#FF4D6D',
        superlike: '#FFD700',
        online: '#00E5A0',
        error: '#FF4D6D',
        success: '#00E5A0',
        white: '#FFFFFF',
        black: '#000000',
        transparent: 'transparent',
    },
    fonts: {
        display: 'System',
        body: 'System',
        mono: 'System',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    borderRadius: {
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        full: 9999,
    },
    screenWidth: width,
    screenHeight: height,
};

export const lightTheme = {
    ...darkTheme,
    colors: {
        ...darkTheme.colors,
        background: '#FAF8FF',
        surface: '#FFFFFF',
        surfaceElevated: '#F0EEFF',
        text: '#0A0A0F',
        textSecondary: '#5A5A7A',
        textMuted: '#A0A0B0',
        border: '#E8E4F0',
        like: '#00C87A',
        dislike: '#FF3355',
        superlike: '#FFB800',
        online: '#00C87A',
        error: '#FF3355',
        success: '#00C87A',
    },
};

export type Theme = typeof darkTheme;
export type ThemeColors = typeof darkTheme.colors;
export type ThemeFonts = typeof darkTheme.fonts;
export type ThemeSpacing = typeof darkTheme.spacing;
export type ThemeBorderRadius = typeof darkTheme.borderRadius;
