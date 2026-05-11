import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../hooks/useTheme';
import { MainTabParamList } from '../types';

// Import screens
import SwipeScreen from '../screens/SwipeScreen';
import MatchesScreen from '../screens/MatchesScreen';
import MapScreen from '../screens/MapScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
    focused: boolean;
    color: string;
    size: number;
    name: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, color, size, name }) => {
    const theme = useTheme();

    if (focused) {
        return (
            <LinearGradient
                colors={theme.colors.gradient as [string, string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeTab}
            >
                <Icon name={name} size={size} color={theme.colors.white} />
            </LinearGradient>
        );
    }

    return <Icon name={name} size={size} color={color} />;
};

const MainTabNavigator: React.FC = () => {
    const theme = useTheme();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                    borderTopWidth: 1,
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 10,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            <Tab.Screen
                name="Discover"
                component={SwipeScreen}
                options={{
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon focused={focused} color={color} size={size} name="flame" />
                    ),
                }}
            />
            <Tab.Screen
                name="Matches"
                component={MatchesScreen}
                options={{
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon focused={focused} color={color} size={size} name="heart" />
                    ),
                }}
            />
            <Tab.Screen
                name="Map"
                component={MapScreen}
                options={{
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon focused={focused} color={color} size={size} name="map" />
                    ),
                    tabBarLabel: 'Map',
                }}
            />
            <Tab.Screen
                name="ChatList"
                component={ChatListScreen}
                options={{
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon focused={focused} color={color} size={size} name="chatbubbles" />
                    ),
                    tabBarLabel: 'Chats',
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: ({ focused, color, size }) => (
                        <TabIcon focused={focused} color={color} size={size} name="person" />
                    ),
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    activeTab: {
        padding: 8,
        borderRadius: 12,
    },
});

export default MainTabNavigator;
