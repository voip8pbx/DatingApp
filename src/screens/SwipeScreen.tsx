import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Image,
    StatusBar,
    Animated,
    PanResponder,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import { useSwipeStore } from '../store';
import { Profile, SwipeDirection } from '../types';
import { mockProfiles } from '../utils/mockData';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

interface ProfileCardProps {
    profile: Profile;
    onSwipe: (direction: SwipeDirection) => void;
    isTop: boolean;
    index: number;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onSwipe, isTop, index }) => {
    const theme = useTheme();
    const [translateX] = useState(new Animated.Value(0));
    const [translateY] = useState(new Animated.Value(0));
    const [rotation] = useState(new Animated.Value(0));

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => isTop,
        onMoveShouldSetPanResponder: () => isTop,
        onPanResponderGrant: () => { },
        onPanResponderMove: (_, gestureState) => {
            translateX.setValue(gestureState.dx);
            translateY.setValue(gestureState.dy);
            rotation.setValue(gestureState.dx / 20);
        },
        onPanResponderRelease: (_, gestureState) => {
            if (gestureState.dx > SWIPE_THRESHOLD) {
                Animated.spring(translateX, {
                    toValue: width * 1.5,
                    useNativeDriver: true,
                }).start(() => onSwipe('like'));
            } else if (gestureState.dx < -SWIPE_THRESHOLD) {
                Animated.spring(translateX, {
                    toValue: -width * 1.5,
                    useNativeDriver: true,
                }).start(() => onSwipe('dislike'));
            } else if (gestureState.dy < -SWIPE_THRESHOLD) {
                Animated.spring(translateY, {
                    toValue: -height * 1.5,
                    useNativeDriver: true,
                }).start(() => onSwipe('superlike'));
            } else {
                Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
                Animated.spring(rotation, { toValue: 0, useNativeDriver: true }).start();
            }
        },
    });

    const rotate = rotation.interpolate({
        inputRange: [-20, 20],
        outputRange: ['-20deg', '20deg'],
    });

    const likeOpacity = translateX.interpolate({
        inputRange: [0, SWIPE_THRESHOLD],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const nopeOpacity = translateX.interpolate({
        inputRange: [-SWIPE_THRESHOLD, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const superlikeOpacity = translateY.interpolate({
        inputRange: [-SWIPE_THRESHOLD, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const scale = 1 - index * 0.05;
    const translateYOffset = index * 15;

    return (
        <Animated.View
            style={[
                styles.cardContainer,
                {
                    transform: [
                        { translateX },
                        { translateY },
                        { rotate },
                        { scale },
                    ],
                    zIndex: 10 - index,
                    top: translateYOffset,
                },
            ]}
            {...panResponder.panHandlers}
        >
            <View style={styles.card}>
                <Image
                    source={{ uri: profile.profile_photos[0] }}
                    style={styles.cardImage}
                    resizeMode="cover"
                />

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                >
                    <Animated.View style={[styles.likeOverlay, { opacity: likeOpacity }]}>
                        <Text style={styles.likeText}>LIKE</Text>
                    </Animated.View>

                    <Animated.View style={[styles.nopeOverlay, { opacity: nopeOpacity }]}>
                        <Text style={styles.nopeText}>NOPE</Text>
                    </Animated.View>

                    <Animated.View style={[styles.superlikeOverlay, { opacity: superlikeOpacity }]}>
                        <Text style={styles.superlikeText}>SUPER</Text>
                    </Animated.View>

                    <View style={styles.cardInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.cardName}>{profile.full_name}</Text>
                            <Text style={styles.cardAge}>{profile.age}</Text>
                        </View>
                        
                        {profile.height && (
                            <View style={styles.metaRow}>
                                <Icon name="resize" size={14} color={theme.colors.white} />
                                <Text style={styles.metaText}>{profile.height}{profile.height_unit}</Text>
                                {profile.religion && (
                                    <>
                                        <View style={styles.dot} />
                                        <Text style={styles.metaText}>{profile.religion}</Text>
                                    </>
                                )}
                            </View>
                        )}

                        <View style={styles.locationRow}>
                            <Icon name="location" size={14} color={theme.colors.white} />
                            <Text style={styles.cardLocation}>{profile.city}</Text>
                        </View>

                        {profile.bio && (
                            <Text style={styles.cardBio} numberOfLines={2}>
                                {profile.bio}
                            </Text>
                        )}

                        <View style={styles.habitsRow}>
                            {profile.drinking_habit && (
                                <View style={styles.habitBadge}>
                                    <Icon name="wine" size={12} color={theme.colors.white} />
                                    <Text style={styles.habitText}>{profile.drinking_habit}</Text>
                                </View>
                            )}
                            {profile.smoking_habit && (
                                <View style={styles.habitBadge}>
                                    <Icon name="logo-no-smoking" size={12} color={theme.colors.white} />
                                    <Text style={styles.habitText}>{profile.smoking_habit}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.interestsRow}>
                            {profile.interests.slice(0, 3).map((interest, i) => (
                                <View key={i} style={styles.interestTag}>
                                    <Text style={styles.interestText}>{interest}</Text>
                                </View>
                            ))}
                        </View>

                        {(profile.school_name || profile.college_name) && (
                            <View style={styles.educationRow}>
                                <Icon name="school" size={14} color={theme.colors.white} />
                                <Text style={styles.educationText} numberOfLines={1}>
                                    {profile.college_name || profile.school_name}
                                </Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>

                <View style={styles.distanceBadge}>
                    <Icon name="navigate" size={12} color={theme.colors.white} />
                    <Text style={styles.distanceText}>{profile.max_distance}km</Text>
                </View>
            </View>
        </Animated.View>
    );
};

const SwipeScreen: React.FC = () => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const [showMatch, setShowMatch] = useState(false);
    const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);

    const {
        profiles,
        setProfiles,
        recordSwipe,
        loadMoreProfiles,
        isLoading,
        hasMore,
        currentIndex,
    } = useSwipeStore();

    useEffect(() => {
        // Load initial profiles
        setProfiles(mockProfiles.slice(0, 5));
    }, []);

    useEffect(() => {
        // Load more when running low
        if (profiles.length - currentIndex < 3 && hasMore && !isLoading) {
            loadMoreProfiles();
        }
    }, [currentIndex, profiles.length, hasMore, isLoading]);

    const handleSwipe = useCallback(async (profile: Profile, direction: SwipeDirection) => {
        const result = await recordSwipe(profile.id, direction);

        if (result.matched) {
            setMatchedProfile(profile);
            setShowMatch(true);
            setTimeout(() => setShowMatch(false), 3000);
        }
    }, [recordSwipe]);

    const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.headerTitle}>Vibe</Text>
                <TouchableOpacity style={styles.filterButton}>
                    <Icon name="options" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Cards */}
            <View style={styles.cardsContainer}>
                {visibleProfiles.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Icon name="heart-dislike" size={80} color={theme.colors.textMuted} />
                        <Text style={styles.emptyTitle}>No more profiles</Text>
                        <Text style={styles.emptySubtitle}>Check back later for new matches</Text>
                    </View>
                ) : (
                    visibleProfiles.map((profile, index) => (
                        <ProfileCard
                            key={profile.id}
                            profile={profile}
                            onSwipe={(direction) => handleSwipe(profile, direction)}
                            isTop={index === 0}
                            index={index}
                        />
                    )).reverse()
                )}
            </View>

            {/* Action Buttons */}
            <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.dislikeButton]}
                    onPress={() => visibleProfiles[0] && handleSwipe(visibleProfiles[0], 'dislike')}
                >
                    <Icon name="close" size={28} color={theme.colors.dislike} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.superlikeButton]}
                    onPress={() => visibleProfiles[0] && handleSwipe(visibleProfiles[0], 'superlike')}
                >
                    <Icon name="star" size={24} color={theme.colors.superlike} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, styles.likeButton]}
                    onPress={() => visibleProfiles[0] && handleSwipe(visibleProfiles[0], 'like')}
                >
                    <Icon name="heart" size={28} color={theme.colors.like} />
                </TouchableOpacity>
            </View>

            {/* Match Modal */}
            {showMatch && matchedProfile && (
                <View style={styles.matchOverlay}>
                    <LinearGradient
                        colors={theme.colors.gradient as [string, string, string]}
                        style={styles.matchGradient}
                    >
                        <Text style={styles.matchTitle}>It's a Match! 🎉</Text>
                        <View style={styles.matchAvatars}>
                            <Image
                                source={{ uri: matchedProfile.profile_photos[0] }}
                                style={styles.matchAvatar}
                            />
                            <View style={styles.matchAvatarPlaceholder} />
                        </View>
                        <Text style={styles.matchSubtitle}>
                            You and {matchedProfile.full_name} liked each other
                        </Text>
                    </LinearGradient>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    filterButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContainer: {
        position: 'absolute',
        width: width - 40,
        height: height * 0.55,
        borderRadius: 20,
        overflow: 'hidden',
    },
    card: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60%',
        justifyContent: 'flex-end',
        padding: 20,
    },
    cardInfo: {
        gap: 8,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    cardName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    cardAge: {
        fontSize: 22,
        color: '#fff',
        opacity: 0.9,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardLocation: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8,
    },
    interestsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    interestTag: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    interestText: {
        color: '#fff',
        fontSize: 12,
    },
    distanceBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    distanceText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    likeOverlay: {
        position: 'absolute',
        top: 50,
        left: 20,
        borderWidth: 4,
        borderColor: '#00E5A0',
        borderRadius: 8,
        padding: 8,
        transform: [{ rotate: '-20deg' }],
    },
    likeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#00E5A0',
    },
    nopeOverlay: {
        position: 'absolute',
        top: 50,
        right: 20,
        borderWidth: 4,
        borderColor: '#FF4D6D',
        borderRadius: 8,
        padding: 8,
        transform: [{ rotate: '20deg' }],
    },
    nopeText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FF4D6D',
    },
    superlikeOverlay: {
        position: 'absolute',
        top: 100,
        alignSelf: 'center',
        borderWidth: 4,
        borderColor: '#FFD700',
        borderRadius: 8,
        padding: 8,
    },
    superlikeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFD700',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        paddingTop: 20,
    },
    actionButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1C1C28',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    metaText: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.9,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    cardBio: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8,
        marginTop: 8,
        lineHeight: 20,
    },
    habitsRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    habitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    habitText: {
        fontSize: 11,
        color: '#fff',
        textTransform: 'capitalize',
    },
    educationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        opacity: 0.8,
    },
    educationText: {
        fontSize: 13,
        color: '#fff',
    },
    dislikeButton: {
        width: 56,
        height: 56,
        borderWidth: 2,
        borderColor: '#FF4D6D',
    },
    superlikeButton: {
        width: 50,
        height: 50,
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    likeButton: {
        width: 64,
        height: 64,
        backgroundColor: '#00E5A0',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#A0A0B0',
    },
    matchOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    matchGradient: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    matchTitle: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 40,
    },
    matchAvatars: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    matchAvatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#fff',
    },
    matchAvatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#784BA0',
        marginLeft: -30,
    },
    matchSubtitle: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
        opacity: 0.9,
    },
});

export default SwipeScreen;
