import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';

import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store';
import { supabase } from '../supabase';
import { Gender } from '../types';

interface SectionHeaderProps {
    title: string;
    icon: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => {
    const theme = useTheme();
    return (
        <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: theme.colors.surfaceElevated }]}>
                <Icon name={icon} size={20} color={theme.colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
        </View>
    );
};

const ProfileSetupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { user, setUser } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [username, setUsername] = useState('');
    const [age, setAge] = useState('');
    const [height, setHeight] = useState('');
    const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
    const [religion, setReligion] = useState('');
    const [gender, setGender] = useState<Gender | null>(null);
    const [interestedIn, setInterestedIn] = useState<Gender | null>(null);
    const [bio, setBio] = useState('');
    const [drinking, setDrinking] = useState<'never' | 'occasionally' | 'regularly' | null>(null);
    const [smoking, setSmoking] = useState<'never' | 'occasionally' | 'regularly' | null>(null);
    const [hometown, setHometown] = useState('');
    const [school, setSchool] = useState('');
    const [college, setCollege] = useState('');

    // Photo State
    const [primaryPhoto, setPrimaryPhoto] = useState<{ uri: string; uploading: boolean, fromRemote?: boolean } | null>(null);
    const [additionalPhotos, setAdditionalPhotos] = useState<{ uri: string; uploading: boolean }[]>([]);

    // Validation State
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Initialize from existing user data (e.g. from Google signup)
    useEffect(() => {
        if (user) {
            if (user.username && !username) setUsername(user.username);
            if (user.full_name && !bio) {
                // Pre-fill something if we had more fields, but for now we focus on photos
            }
            if (user.avatar_url && !primaryPhoto) {
                setPrimaryPhoto({ uri: user.avatar_url, uploading: false, fromRemote: true });
            }
        }
    }, [user]);

    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!username) newErrors.username = 'Username is required';
        else if (username.length < 3) newErrors.username = 'Username too short';

        if (!age) newErrors.age = 'Age is required';
        else if (parseInt(age) < 18) newErrors.age = 'Must be at least 18';

        if (!gender) newErrors.gender = 'Please select your gender';
        if (!interestedIn) newErrors.interestedIn = 'Please select what you are looking for';
        if (!primaryPhoto) newErrors.photos = 'Primary photo is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [username, age, gender, interestedIn, primaryPhoto]);

    const isFormValid =
        username.length >= 3 &&
        parseInt(age) >= 18 &&
        gender !== null &&
        interestedIn !== null &&
        primaryPhoto !== null &&
        religion.length > 0 &&
        bio.length > 0 &&
        drinking !== null &&
        smoking !== null &&
        hometown.length > 0 &&
        school.length > 0 &&
        college.length > 0 &&
        height.length > 0;

    const handleImageUpload = async (isPrimary: boolean, index?: number) => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
        });

        if (result.didCancel || !result.assets?.[0]?.uri) return;

        const uri = result.assets[0].uri;

        if (isPrimary) {
            setPrimaryPhoto({ uri, uploading: true });
        } else {
            const newPhotos = [...additionalPhotos];
            if (index !== undefined && index < newPhotos.length) {
                newPhotos[index] = { uri, uploading: true };
            } else {
                newPhotos.push({ uri, uploading: true });
            }
            setAdditionalPhotos(newPhotos);
        }

        try {
            // In a real app, we would upload to Supabase Storage here
            // const fileName = `${user?.id}/${Date.now()}.jpg`;
            // const uploadRes = await uploadProfileImage(user!.id, uri);

            // Simulating upload
            await new Promise(resolve => setTimeout(() => resolve(null), 1500));

            if (isPrimary) {
                setPrimaryPhoto({ uri, uploading: false });
            } else {
                setAdditionalPhotos(prev => {
                    const updated = [...prev];
                    const photoIndex = index !== undefined ? index : updated.length - 1;
                    if (updated[photoIndex]) {
                        updated[photoIndex] = { ...updated[photoIndex], uploading: false };
                    }
                    return updated;
                });
            }
        } catch (error) {
            Alert.alert('Upload Failed', 'There was an error uploading your photo.');
            if (isPrimary) setPrimaryPhoto(null);
            else {
                setAdditionalPhotos(prev => prev.filter((_, i) => i !== (index ?? prev.length - 1)));
            }
        }
    };

    const removePhoto = (isPrimary: boolean, index?: number) => {
        if (isPrimary) {
            setPrimaryPhoto(null);
        } else {
            setAdditionalPhotos(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error('Not authenticated');

            const finalPhotos = [primaryPhoto!.uri, ...additionalPhotos.map(p => p.uri)];

            const profileData: any = {
                id: authUser.id,
                email: authUser.email,
                username: username.toLowerCase(),
                full_name: username,
                age: parseInt(age),
                gender: gender as Gender,
                interested_gender: [interestedIn as Gender],
                height: parseFloat(height),
                height_unit: heightUnit,
                religion,
                bio,
                drinking_habit: drinking,
                smoking_habit: smoking,
                hometown,
                school_name: school,
                college_name: college,
                profile_photos: finalPhotos,
                avatar_url: primaryPhoto!.uri,
                location: hometown,
                city: hometown,
                last_active: new Date().toISOString(),
                created_at: new Date().toISOString(),
                location_sharing_enabled: true,
                ghost_mode_enabled: false,
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(profileData);

            if (error) throw error;

            // Update local state
            setUser({
                ...profileData,
                interests: [],
                max_distance: 50,
                age_min: 18,
                age_max: 35,
                is_premium: false,
            });

            // Navigate to main app
            navigation.replace('Main');
        } catch (error: any) {
            Alert.alert('Submission Failed', error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.title}>Complete Your Profile</Text>
                    <Text style={styles.subtitle}>Help us find the best matches for you</Text>

                    {/* Personal Information */}
                    <SectionHeader title="Personal Information" icon="person-outline" />
                    <View style={styles.section}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                                placeholder="Enter username"
                                placeholderTextColor={theme.colors.textMuted}
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                            />
                            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Age</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                                    placeholder="24"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={age}
                                    onChangeText={setAge}
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                                {errors.age && <Text style={styles.errorText}>{errors.age}</Text>}
                            </View>

                            <View style={[styles.inputGroup, { flex: 2, marginLeft: 12 }]}>
                                <Text style={styles.label}>Height</Text>
                                <View style={styles.heightInputContainer}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, backgroundColor: theme.colors.surface, color: theme.colors.text, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                                        placeholder={heightUnit === 'cm' ? '175' : "5'10"}
                                        placeholderTextColor={theme.colors.textMuted}
                                        value={height}
                                        onChangeText={setHeight}
                                        keyboardType="numeric"
                                    />
                                    <TouchableOpacity
                                        style={[styles.unitToggle, { backgroundColor: theme.colors.surfaceElevated }]}
                                        onPress={() => setHeightUnit(heightUnit === 'cm' ? 'ft' : 'cm')}
                                    >
                                        <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{heightUnit}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Religion</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                                placeholder="Enter religion"
                                placeholderTextColor={theme.colors.textMuted}
                                value={religion}
                                onChangeText={setReligion}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>I am</Text>
                            <View style={styles.genderOptions}>
                                {(['male', 'female', 'non-binary'] as Gender[]).map(g => (
                                    <TouchableOpacity
                                        key={g}
                                        onPress={() => setGender(g)}
                                        style={[
                                            styles.genderPill,
                                            { backgroundColor: theme.colors.surface },
                                            gender === g && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary, borderWidth: 1 }
                                        ]}
                                    >
                                        <Text style={{ color: gender === g ? theme.colors.primary : theme.colors.text, textTransform: 'capitalize' }}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Interested In</Text>
                            <View style={styles.genderOptions}>
                                {(['male', 'female', 'other'] as Gender[]).map(g => (
                                    <TouchableOpacity
                                        key={g}
                                        onPress={() => setInterestedIn(g)}
                                        style={[
                                            styles.genderPill,
                                            { backgroundColor: theme.colors.surface },
                                            interestedIn === g && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary, borderWidth: 1 }
                                        ]}
                                    >
                                        <Text style={{ color: interestedIn === g ? theme.colors.primary : theme.colors.text, textTransform: 'capitalize' }}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Profile Photos */}
                    <SectionHeader title="Profile Photos" icon="camera-outline" />
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={[styles.primaryPhotoContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                            onPress={() => handleImageUpload(true)}
                        >
                            {primaryPhoto ? (
                                <>
                                    <Image source={{ uri: primaryPhoto.uri }} style={styles.photo} />
                                    {primaryPhoto.uploading && (
                                        <View style={styles.uploadOverlay}>
                                            <ActivityIndicator color={theme.colors.primary} />
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => removePhoto(true)}
                                    >
                                        <Icon name="close-circle" size={24} color={theme.colors.error} />
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={styles.uploadPlaceholder}>
                                    <Icon name="add" size={40} color={theme.colors.textMuted} />
                                    <Text style={{ color: theme.colors.textMuted }}>Upload Primary Photo</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.additionalPhotosGrid}>
                            {[0, 1, 2, 3].map(index => {
                                const photo = additionalPhotos[index];
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.photoSlot, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                                        onPress={() => handleImageUpload(false, index)}
                                        disabled={!primaryPhoto}
                                    >
                                        {photo ? (
                                            <>
                                                <Image source={{ uri: photo.uri }} style={styles.photo} />
                                                {photo.uploading && (
                                                    <View style={styles.uploadOverlay}>
                                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                                    </View>
                                                )}
                                                <TouchableOpacity
                                                    style={styles.removeButtonSmall}
                                                    onPress={() => removePhoto(false, index)}
                                                >
                                                    <Icon name="close-circle" size={20} color={theme.colors.error} />
                                                </TouchableOpacity>
                                            </>
                                        ) : (
                                            <Icon name="add" size={24} color={theme.colors.textMuted} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {!primaryPhoto && <Text style={styles.hintText}>Upload primary photo first</Text>}
                    </View>

                    {/* Bio */}
                    <SectionHeader title="About You" icon="create-outline" />
                    <View style={styles.section}>
                        <View style={styles.inputGroup}>
                            <View style={[styles.bioContainer, { backgroundColor: theme.colors.surface }]}>
                                <TextInput
                                    style={[styles.bioInput, { color: theme.colors.text }]}
                                    placeholder="Write something interesting about yourself..."
                                    placeholderTextColor={theme.colors.textMuted}
                                    multiline
                                    maxLength={300}
                                    value={bio}
                                    onChangeText={setBio}
                                />
                                <Text style={styles.charLimit}>{bio.length}/300</Text>
                            </View>
                        </View>
                    </View>

                    {/* Lifestyle Habits */}
                    <SectionHeader title="Lifestyle Habits" icon="cafe-outline" />
                    <View style={styles.section}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Drinking</Text>
                            <View style={styles.habitOptions}>
                                {(['never', 'occasionally', 'regularly'] as const).map(option => (
                                    <TouchableOpacity
                                        key={option}
                                        onPress={() => setDrinking(option)}
                                        style={[
                                            styles.habitPill,
                                            { backgroundColor: theme.colors.surface },
                                            drinking === option && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary, borderWidth: 1 }
                                        ]}
                                    >
                                        <Text style={{ color: drinking === option ? theme.colors.primary : theme.colors.text, textTransform: 'capitalize' }}>{option}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Smoking</Text>
                            <View style={styles.habitOptions}>
                                {(['never', 'occasionally', 'regularly'] as const).map(option => (
                                    <TouchableOpacity
                                        key={option}
                                        onPress={() => setSmoking(option)}
                                        style={[
                                            styles.habitPill,
                                            { backgroundColor: theme.colors.surface },
                                            smoking === option && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary, borderWidth: 1 }
                                        ]}
                                    >
                                        <Text style={{ color: smoking === option ? theme.colors.primary : theme.colors.text, textTransform: 'capitalize' }}>{option}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Education */}
                    <SectionHeader title="Educational Background" icon="school-outline" />
                    <View style={styles.section}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Hometown</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                                placeholder="Where are you from?"
                                placeholderTextColor={theme.colors.textMuted}
                                value={hometown}
                                onChangeText={setHometown}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>School</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                                placeholder="High school name"
                                placeholderTextColor={theme.colors.textMuted}
                                value={school}
                                onChangeText={setSchool}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>College / University</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                                placeholder="University name"
                                placeholderTextColor={theme.colors.textMuted}
                                value={college}
                                onChangeText={setCollege}
                            />
                        </View>
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitButton, (!isFormValid || isLoading) && styles.disabledButton]}
                        onPress={handleSubmit}
                        disabled={!isFormValid || isLoading}
                    >
                        <LinearGradient
                            colors={isFormValid ? theme.colors.gradient : ['#444', '#333']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.gradient}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>Complete Profile</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#A0A0B0',
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 24,
        gap: 12,
    },
    sectionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    section: {
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#A0A0B0',
        marginLeft: 4,
    },
    input: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
    },
    heightInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    unitToggle: {
        paddingHorizontal: 16,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
    genderOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    genderPill: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        minWidth: 90,
        alignItems: 'center',
    },
    primaryPhotoContainer: {
        width: '100%',
        height: 250,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        overflow: 'hidden',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    uploadPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    uploadOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    removeButtonSmall: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    additionalPhotosGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    photoSlot: {
        width: '23%',
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    hintText: {
        fontSize: 12,
        color: '#ff4444',
        textAlign: 'center',
        marginTop: 8,
    },
    bioContainer: {
        borderRadius: 16,
        padding: 16,
        minHeight: 120,
    },
    bioInput: {
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    charLimit: {
        fontSize: 12,
        color: '#A0A0B0',
        textAlign: 'right',
        marginTop: 8,
    },
    habitOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    habitPill: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButton: {
        marginTop: 40,
        borderRadius: 30,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#FF3CAC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    disabledButton: {
        shadowOpacity: 0,
        elevation: 0,
    },
    gradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 12,
        marginLeft: 4,
        marginTop: 2,
    },
});

export default ProfileSetupScreen;
