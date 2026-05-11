import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
    Image,
    Easing,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { Profile } from '../types';

const { width, height } = Dimensions.get('window');

interface Sparkle {
    id: number;
    x: number;
    size: number;
    opacity: Animated.Value;
    translateY: Animated.Value;
    delay: number;
    color: string;
}

interface MatchPopupProps {
    visible: boolean;
    matchedProfile: Profile | null;
    onClose: () => void;
    currentUserPhoto?: string;
}

const MatchPopup: React.FC<MatchPopupProps> = ({
    visible,
    matchedProfile,
    onClose,
    currentUserPhoto,
}) => {
    const theme = useTheme();
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const heartScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Generate sparkles
            const newSparkles: Sparkle[] = [];
            const colors = ['#FFD700', '#FF3CAC', '#00E5A0', '#FF6B6B', '#C77DFF', '#FFD700'];

            for (let i = 0; i < 40; i++) {
                newSparkles.push({
                    id: i,
                    x: Math.random() * width,
                    size: Math.random() * 8 + 4,
                    opacity: new Animated.Value(0),
                    translateY: new Animated.Value(-50),
                    delay: Math.random() * 500,
                    color: colors[Math.floor(Math.random() * colors.length)],
                });
            }
            setSparkles(newSparkles);

            // Reset animations
            scaleAnim.setValue(0);
            fadeAnim.setValue(0);
            heartScale.setValue(0);

            // Animate popup
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.delay(300),
                    Animated.spring(heartScale, {
                        toValue: 1,
                        friction: 3,
                        tension: 80,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();

            // Animate sparkles
            newSparkles.forEach((sparkle, index) => {
                Animated.sequence([
                    Animated.delay(sparkle.delay),
                    Animated.parallel([
                        Animated.timing(sparkle.opacity, {
                            toValue: 1,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(sparkle.translateY, {
                            toValue: height,
                            duration: 2000 + Math.random() * 1000,
                            easing: Easing.linear,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.timing(sparkle.opacity, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ]).start();
            });
        }
    }, [visible]);

    const handleClose = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <TouchableOpacity
                activeOpacity={1}
                style={styles.overlay}
                onPress={handleClose}
            >
                {/* Sparkles */}
                {sparkles.map((sparkle) => (
                    <Animated.View
                        key={sparkle.id}
                        style={[
                            styles.sparkle,
                            {
                                left: sparkle.x,
                                width: sparkle.size,
                                height: sparkle.size,
                                borderRadius: sparkle.size / 2,
                                backgroundColor: sparkle.color,
                                opacity: sparkle.opacity,
                                transform: [
                                    { translateY: sparkle.translateY },
                                    { rotate: `${Math.random() * 360}deg` },
                                ],
                            },
                        ]}
                    />
                ))}

                {/* Gradient Background */}
                <LinearGradient
                    colors={['rgba(255,60,172,0.95)', 'rgba(120,75,160,0.95)', 'rgba(43,134,197,0.95)']}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Content */}
                <Animated.View
                    style={[
                        styles.content,
                        { transform: [{ scale: scaleAnim }] }
                    ]}
                >
                    {/* Header with hearts */}
                    <View style={styles.heartsContainer}>
                        <Animated.Text style={[styles.hearts, { transform: [{ scale: heartScale }] }]}>
                            💕
                        </Animated.Text>
                    </View>

                    <Text style={styles.title}>It's a Match!</Text>
                    <Text style={styles.subtitle}>
                        You and {matchedProfile?.full_name || 'someone special'} liked each other
                    </Text>

                    {/* Avatars */}
                    <View style={styles.avatarsContainer}>
                        <View style={styles.avatarWrapper}>
                            <Image
                                source={{ uri: currentUserPhoto || 'https://i.pravatar.cc/150?img=1' }}
                                style={styles.avatar}
                            />
                            <View style={[styles.avatarRing, { borderColor: theme.colors.primary }]} />
                        </View>

                        <View style={styles.heartBetweenAvatars}>
                            <Text style={styles.heartEmoji}>💖</Text>
                        </View>

                        <View style={styles.avatarWrapper}>
                            <Image
                                source={{ uri: matchedProfile?.profile_photos?.[0] || 'https://i.pravatar.cc/150?img=2' }}
                                style={styles.avatar}
                            />
                            <View style={[styles.avatarRing, { borderColor: theme.colors.primary }]} />
                        </View>
                    </View>

                    {/* Message Preview */}
                    <View style={styles.messagePreview}>
                        <Text style={styles.messagePreviewText}>
                            Send them a message to break the ice! 👋
                        </Text>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonsContainer}>
                        <TouchableOpacity
                            style={[styles.sendMessageButton, { backgroundColor: theme.colors.white }]}
                            onPress={handleClose}
                        >
                            <Text style={[styles.sendMessageText, { color: theme.colors.primary }]}>
                                Send a Message
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.keepSwipingButton, { borderColor: theme.colors.white }]}
                            onPress={handleClose}
                        >
                            <Text style={[styles.keepSwipingText, { color: theme.colors.white }]}>
                                Keep Swiping
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    sparkle: {
        position: 'absolute',
        top: -20,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 24,
        width: width - 40,
    },
    heartsContainer: {
        marginBottom: 16,
    },
    hearts: {
        fontSize: 40,
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: 32,
    },
    avatarsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    avatarRing: {
        position: 'absolute',
        top: -5,
        left: -5,
        right: -5,
        bottom: -5,
        borderRadius: 55,
        borderWidth: 2,
        opacity: 0.5,
    },
    heartBetweenAvatars: {
        marginHorizontal: 16,
    },
    heartEmoji: {
        fontSize: 32,
    },
    messagePreview: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        marginBottom: 24,
    },
    messagePreviewText: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    buttonsContainer: {
        gap: 12,
        width: '100%',
    },
    sendMessageButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    sendMessageText: {
        fontSize: 18,
        fontWeight: '600',
    },
    keepSwipingButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        borderWidth: 2,
        alignItems: 'center',
    },
    keepSwipingText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default MatchPopup;