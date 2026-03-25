import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Switch,
    StatusBar,
    Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme, useToggleTheme, useIsDark } from '../hooks/useTheme';
import { useAuthStore, useMatchStore } from '../store';
import { supabase } from '../supabase';
import { Config } from '../constants/Config';
import { Profile } from '../types';

const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const toggleTheme = useToggleTheme();
    const isDark = useIsDark();
    const { logout, user, setUser } = useAuthStore();
    const { matches, loadMatches } = useMatchStore();

    useEffect(() => {
        loadMatches();
    }, []);

    // Fetch profiles of other users
    const fetchProfiles = async () => {
        if (!user) return;

        setLoadingProfiles(true);
        setErrorProfiles(null);

        try {
            // Fetch profiles directly from Supabase (bypassing backend gender filters)
            const { data: profilesData, error } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', user.id) // Exclude current user
                .order('last_active', { ascending: false });

            if (error) {
                throw error;
            }

            setProfiles(profilesData || []);
        } catch (error) {
            console.error('Error fetching profiles:', error);
            setErrorProfiles('Failed to load profiles');
            setProfiles([]);
        } finally {
            setLoadingProfiles(false);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, [user]);

    const [locationSharingEnabled, setLocationSharingEnabled] = useState(
        user?.location_sharing_enabled ?? true
    );
    const [ghostModeEnabled, setGhostModeEnabled] = useState(
        user?.ghost_mode_enabled ?? false
    );

    // State for displaying other profiles
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(true);
    const [errorProfiles, setErrorProfiles] = useState<string | null>(null);

    // Get current user profile from auth store
    const userProfile = {
        name: user?.full_name || 'You',
        age: user?.age || '',
        bio: user?.bio || 'Looking for someone to go on adventures with! 🌍',
        city: user?.city || user?.hometown || 'Updating...',
        interests: user?.interests || [],
        photos: user?.profile_photos && user.profile_photos.length > 0
            ? user.profile_photos
            : [user?.avatar_url || 'https://i.pravatar.cc/300?img=1'],
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
            ]
        );
    };

    const handleLocationSharingToggle = async (value: boolean) => {
        setLocationSharingEnabled(value);

        // Update profile in Supabase
        if (user) {
            const { error } = await supabase
                .from('profiles')
                .update({ location_sharing_enabled: value })
                .eq('id', user.id);

            if (error) {
                console.error('Error updating location sharing:', error);
                Alert.alert('Error', 'Failed to update location sharing settings');
                setLocationSharingEnabled(!value);
            } else {
                // If disabling, delete location from user_locations
                if (!value) {
                    await supabase
                        .from('user_locations')
                        .delete()
                        .eq('id', user.id);
                }

                // Update local user state
                setUser({ ...user, location_sharing_enabled: value });
            }
        }
    };

    const handleGhostModeToggle = async (value: boolean) => {
        setGhostModeEnabled(value);

        // Update profile in Supabase
        if (user) {
            const { error } = await supabase
                .from('profiles')
                .update({ ghost_mode_enabled: value })
                .eq('id', user.id);

            if (error) {
                console.error('Error updating ghost mode:', error);
                Alert.alert('Error', 'Failed to update ghost mode settings');
                setGhostModeEnabled(!value);
            } else {
                setUser({ ...user, ghost_mode_enabled: value });
            }
        }
    };

    const SettingItem: React.FC<{
        icon: string;
        title: string;
        subtitle?: string;
        onPress?: () => void;
        rightElement?: React.ReactNode;
    }> = ({ icon, title, subtitle, onPress, rightElement }) => (
        <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={[styles.settingIcon, { backgroundColor: theme.colors.surfaceElevated }]}>
                <Icon name={icon} size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{title}</Text>
                {subtitle && (
                    <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                        {subtitle}
                    </Text>
                )}
            </View>
            {rightElement || (
                onPress && <Icon name="chevron-forward" size={20} color={theme.colors.textMuted} />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => navigation.navigate('EditProfile')}
                    >
                        <Icon name="pencil" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Profile Hero */}
                <View style={styles.profileHero}>
                    <Image
                        source={{ uri: userProfile.photos[0] }}
                        style={styles.profileImage}
                    />
                    <LinearGradient
                        colors={['transparent', theme.colors.background]}
                        style={styles.heroGradient}
                    />
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>
                            {userProfile.name}, {userProfile.age}
                        </Text>
                        <View style={styles.profileLocation}>
                            <Icon name="location" size={14} color={theme.colors.textSecondary} />
                            <Text style={styles.profileCity}>{userProfile.city}</Text>
                        </View>
                        <Text style={styles.profileBio}>{userProfile.bio}</Text>
                        <View style={styles.interestsContainer}>
                            {userProfile.interests.map((interest, index) => (
                                <View
                                    key={index}
                                    style={[styles.interestPill, { backgroundColor: theme.colors.surfaceElevated }]}
                                >
                                    <Text style={styles.interestText}>{interest}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Additional Photos Grid */}
                {userProfile.photos.length > 1 && (
                    <View style={styles.photosGridContainer}>
                        <Text style={styles.photosGridTitle}>More Photos</Text>
                        <View style={styles.photosGrid}>
                            {userProfile.photos.slice(1, 5).map((photo, index) => (
                                <View key={index} style={styles.photoGridItem}>
                                    <Image
                                        source={{ uri: photo }}
                                        style={styles.photoGridImage}
                                    />
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Stats */}
                <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>0</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{matches.length}</Text>
                        <Text style={styles.statLabel}>Matches</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{user?.is_premium ? 'YES' : 'NO'}</Text>
                        <Text style={styles.statLabel}>Premium</Text>
                    </View>
                </View>

                {/* Settings */}
                <View style={styles.settingsSection}>
                    <Text style={styles.sectionTitle}>Preferences</Text>

                    <SettingItem
                        icon={isDark ? 'moon' : 'sunny'}
                        title="Dark Mode"
                        subtitle={isDark ? 'On' : 'Off'}
                        rightElement={
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={theme.colors.white}
                            />
                        }
                    />

                    <SettingItem
                        icon="notifications"
                        title="Notifications"
                        subtitle="Push notifications"
                        onPress={() => { }}
                    />

                    <SettingItem
                        icon="location"
                        title="Share My Location"
                        subtitle={locationSharingEnabled ? 'On - Visible to matches' : 'Off - Hidden from everyone'}
                        rightElement={
                            <Switch
                                value={locationSharingEnabled}
                                onValueChange={handleLocationSharingToggle}
                                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                thumbColor={theme.colors.white}
                            />
                        }
                    />

                    {locationSharingEnabled && (
                        <SettingItem
                            icon="spy"
                            title="Ghost Mode"
                            subtitle={ghostModeEnabled ? 'On - Location is fuzzed' : 'Off - Exact location shown'}
                            rightElement={
                                <Switch
                                    value={ghostModeEnabled}
                                    onValueChange={handleGhostModeToggle}
                                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                                    thumbColor={theme.colors.white}
                                />
                            }
                        />
                    )}
                </View>

                <View style={styles.settingsSection}>
                    <Text style={styles.sectionTitle}>Account</Text>

                    <SettingItem
                        icon="settings"
                        title="Settings"
                        onPress={() => { }}
                    />

                    <SettingItem
                        icon="help-circle"
                        title="Help & Support"
                        onPress={() => { }}
                    />

                    <SettingItem
                        icon="shield-checkmark"
                        title="Privacy Policy"
                        onPress={() => { }}
                    />

                    <SettingItem
                        icon="document-text"
                        title="Terms of Service"
                        onPress={() => { }}
                    />
                </View>

                <View style={styles.settingsSection}>
                    <SettingItem
                        icon="log-out"
                        title="Logout"
                        onPress={handleLogout}
                    />

                    <SettingItem
                        icon="trash"
                        title="Delete Account"
                        subtitle="This action cannot be undone"
                        onPress={() => { }}
                    />
                </View>

                <View style={{ height: insets.bottom + 100 }} />
            </ScrollView>
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
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    editButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,60,172,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileHero: {
        position: 'relative',
    },
    profileImage: {
        width: '100%',
        height: 300,
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    profileInfo: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
    },
    profileName: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    profileLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    profileCity: {
        fontSize: 14,
        color: '#A0A0B0',
    },
    profileBio: {
        fontSize: 14,
        color: '#fff',
        marginTop: 12,
        opacity: 0.9,
    },
    interestsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    interestPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    interestText: {
        fontSize: 12,
        color: '#A0A0B0',
    },
    statsContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 20,
        padding: 20,
        borderRadius: 16,
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    statLabel: {
        fontSize: 12,
        color: '#A0A0B0',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 40,
    },
    settingsSection: {
        marginTop: 24,
        paddingHorizontal: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#A0A0B0',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    // Styles for profile discovery
    loadingContainer: {
        padding: 20,
        textAlign: 'center',
    },
    loadingText: {
        fontSize: 16,
    },
    errorContainer: {
        padding: 20,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        marginBottom: 12,
    },
    retryButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    retryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    emptyContainer: {
        padding: 20,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
    },
    profilesList: {
        padding: 16,
    },
    profileCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    profileCardImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 12,
    },
    profileCardInfo: {
        flex: 1,
    },
    profileCardName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    profileCardLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    profileCardCity: {
        fontSize: 14,
    },
    profileCardBio: {
        fontSize: 14,
        marginBottom: 12,
        lineHeight: 20,
    },
    // Photo grid styles
    photosGridContainer: {
        paddingHorizontal: 16,
        marginTop: 20,
    },
    photosGridTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#A0A0B0',
        marginBottom: 12,
    },
    photosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    photoGridItem: {
        width: '48%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    photoGridImage: {
        width: '100%',
        height: '100%',
    },
});

export default ProfileScreen;
