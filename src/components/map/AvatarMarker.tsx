import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme, useIsDark } from '../../hooks/useTheme';

interface AvatarMarkerProps {
    avatarUrl: string | null;
    name: string;
    isOnline: boolean;
    size?: number;
}

const AvatarMarker: React.FC<AvatarMarkerProps> = ({
    avatarUrl,
    name,
    isOnline,
    size = 50,
}) => {
    const theme = useTheme();
    const isOnlineIndicator = useIsDark();

    const pulseOpacity = useSharedValue(1);
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        if (isOnline) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            );

            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                false
            );
        } else {
            pulseOpacity.value = 0;
            pulseScale.value = 1;
        }
    }, [isOnline, pulseOpacity, pulseScale]);

    const pulseAnimatedStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
        transform: [{ scale: pulseScale.value }],
    }));

    const borderColor = isOnline ? theme.colors.primary : theme.colors.textMuted;
    const onlineIndicatorColor = isOnline ? theme.colors.online : theme.colors.textMuted;

    // Generate initials
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    if (!avatarUrl) {
        // Show initials in gradient circle when no avatar
        return (
            <View style={[styles.container, { width: size, height: size }]}>
                <LinearGradient
                    colors={theme.colors.gradient as [string, string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.avatarContainer,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            borderColor: borderColor,
                        },
                    ]}
                >
                    <Text style={[styles.initials, { fontSize: size * 0.35 }]}>
                        {initials}
                    </Text>
                </LinearGradient>
                {/* Online indicator */}
                <View
                    style={[
                        styles.onlineIndicator,
                        {
                            backgroundColor: onlineIndicatorColor,
                            borderColor: theme.colors.background,
                        },
                    ]}
                />
            </View>
        );
    }

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Pulse effect for online users */}
            {isOnline && (
                <Animated.View
                    style={[
                        styles.pulse,
                        {
                            width: size + 10,
                            height: size + 10,
                            borderRadius: (size + 10) / 2,
                            backgroundColor: theme.colors.primary,
                        },
                        pulseAnimatedStyle,
                    ]}
                />
            )}

            {/* Main avatar */}
            <View
                style={[
                    styles.avatarContainer,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderColor: borderColor,
                    },
                ]}
            >
                <Image
                    source={{ uri: avatarUrl }}
                    style={[
                        styles.avatar,
                        {
                            width: size - 6,
                            height: size - 6,
                            borderRadius: (size - 6) / 2,
                        },
                    ]}
                />
            </View>

            {/* Online indicator */}
            <View
                style={[
                    styles.onlineIndicator,
                    {
                        backgroundColor: onlineIndicatorColor,
                        borderColor: theme.colors.background,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarContainer: {
        borderWidth: 3,
        backgroundColor: '#1C1C28',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatar: {
        resizeMode: 'cover',
    },
    initials: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
    },
    pulse: {
        position: 'absolute',
    },
});

export default AvatarMarker;
