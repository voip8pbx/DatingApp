import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import { useAuthStore } from '../store';
import { RootStackParamList } from '../types';

// Screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import MainTabNavigator from './MainTabNavigator';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
    const { isAuthenticated, isLoading, initializeAuth, user } = useAuthStore();
    const [showSplash, setShowSplash] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        initializeAuth();
    }, []);

    const handleSplashFinish = () => {
        setShowSplash(false);
        setShowOnboarding(true);
    };

    const handleOnboardingFinish = () => {
        setShowOnboarding(false);
    };

    if (showSplash) {
        return <SplashScreen onFinish={handleSplashFinish} />;
    }

    if (showOnboarding) {
        return <OnboardingScreen onGetStarted={handleOnboardingFinish} />;
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: 'transparent' },
            }}
        >
            {!isAuthenticated ? (
                <>
                    <Stack.Screen name="Login" component={LoginScreen} />
                    <Stack.Screen name="Signup" component={SignupScreen} />
                </>
            ) : (
                <>
                    {/* Check if user profile is complete. If not, show setup first */}
                    {!user?.username ? (
                        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
                    ) : (
                        <>
                            <Stack.Screen name="Main" component={MainTabNavigator} />
                            <Stack.Screen
                                name="ChatRoom"
                                component={ChatRoomScreen}
                                options={{
                                    presentation: 'card',
                                }}
                            />
                            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
                        </>
                    )}
                </>
            )}
        </Stack.Navigator>
    );
};

export default RootNavigator;
