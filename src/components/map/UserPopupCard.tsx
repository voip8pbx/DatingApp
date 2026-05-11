import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import type { MatchedUserLocation } from '../../types';

interface UserPopupCardProps {
    user: MatchedUserLocation;
    onChatPress: () => void;
    currentLocation?: { latitude: number; longitude: number } | null;
}

// Calculate distance between two coordinates in km
const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Format last active time
const formatLastActive = (updatedAt: string): string => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Active just now';
    if (diffMins < 60) return `Active ${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `Active ${diffDays}d ago`;
};

const UserPopupCard: React.FC<UserPopupCardProps> = ({
    user,
    onChatPress,
    currentLocation,
}) => {
    const theme = useTheme();

    // Calculate distance
    let distanceText = '';
    if (currentLocation) {
        const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            user.latitude,
            user.longitude
        );
        if (distance < 1) {
            distanceText = `${Math.round(distance * 1000)}m away`;
        } else {
            distanceText = `${distance.toFixed(1)} km away`;
        }
    }

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                },
            ]}
        >
            {/* Header with avatar and info */}
            <View style={styles.header}>
                <Image
                    source={{
                        uri: user.profile.avatar_url || 'https://via.placeholder.com/40',
                    }}
                    style={[
                        styles.avatar,
                        {
                            borderColor: user.isOnline
                                ? theme.colors.primary
                                : theme.colors.textMuted,
                        },
                    ]}
                />
                <View style={styles.info}>
                    <Text
                        style={[
                            styles.name,
                            { color: theme.colors.text },
                        ]}
                        numberOfLines={1}
                    >
                        {user.profile.full_name}
                    </Text>
                    <View style={styles.statusRow}>
                        <View
                            style={[
                                styles.onlineDot,
                                {
                                    backgroundColor: user.isOnline
                                        ? theme.colors.online
                                        : theme.colors.textMuted,
                                },
                            ]}
                        />
                        <Text
                            style={[
                                styles.status,
                                { color: theme.colors.textSecondary },
                            ]}
                        >
                            {user.isOnline ? 'Online' : formatLastActive(user.updated_at)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Distance */}
            {distanceText && (
                <Text
                    style={[
                        styles.distance,
                        { color: theme.colors.textSecondary },
                    ]}
                >
                    📍 {distanceText}
                </Text>
            )}

            {/* Chat button */}
            <TouchableOpacity
                style={[
                    styles.chatButton,
                    { backgroundColor: theme.colors.primary },
                ]}
                onPress={onChatPress}
                activeOpacity={0.8}
            >
                <Text style={styles.chatButtonText}>💬 Send Message</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 220,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
    },
    info: {
        marginLeft: 10,
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    status: {
        fontSize: 12,
    },
    distance: {
        fontSize: 12,
        marginTop: 8,
    },
    chatButton: {
        marginTop: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    chatButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default UserPopupCard;
