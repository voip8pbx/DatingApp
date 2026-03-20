import React from 'react';
import './src/global.css';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Load icon font manually
Ionicons.loadFont();

import { RootNavigator } from './src/navigation';
import { useThemeStore } from './src/store';
import { darkTheme, lightTheme } from './src/theme';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuthStore } from './src/store';
import { GOOGLE_CLIENT_ID } from '@env';

GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID,
  offlineAccess: true,
});


const App: React.FC = () => {
  const isDark = useThemeStore((state) => state.isDark);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const theme = isDark ? darkTheme : lightTheme;

  React.useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const navigationTheme = isDark
    ? {
      ...DarkTheme,
      colors: {
        ...DarkTheme.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        primary: theme.colors.primary,
      },
    }
    : {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        primary: theme.colors.primary,
      },
    };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
