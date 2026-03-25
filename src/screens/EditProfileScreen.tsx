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
import { supabase, uploadProfileImage } from '../supabase';
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

const EditProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { user, setUser } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [username, setUsername] = useState(user?.username || '');
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [age, setAge] = useState(user?.age ? user.age.toString() : '');
    const [height, setHeight] = useState(user?.height ? user.height.toString() : '');
    const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>(user?.height_unit || 'cm');
    const [religion, setReligion] = useState(user?.religion || '');
    const [gender, setGender] = useState<Gender | null>(user?.gender || null);
    const [interestedIn, setInterestedIn] = useState<Gender | null>(user?.interested_gender?.[0] || null);
    const [bio, setBio] = useState(user?.bio || '');
    const [drinking, setDrinking] = useState<'never' | 'occasionally' | 'regularly' | null>(user?.drinking_habit || null);
    const [smoking, setSmoking] = useState<'never' | 'occasionally' | 'regularly' | null>(user?.smoking_habit || null);
    const [hometown, setHometown] = useState(user?.hometown || '');
    const [school, setSchool] = useState(user?.school_name || '');
    const [college, setCollege] = useState(user?.college_name || '');

    // Photo State
    const [primaryPhoto, setPrimaryPhoto] = useState<{ uri: string; uploading: boolean } | null>(
        user?.avatar_url ? { uri: user.avatar_url, uploading: false } : null
    );
    const [additionalPhotos, setAdditionalPhotos] = useState<{ uri: string; uploading: boolean }[]>(
        user?.profile_photos ? user.profile_photos.slice(1).map(uri => ({ uri, uploading: false })) : []
    );

    // Validation State
    const [errors, setErrors] = useState<Record<string, string>>({});

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

    const handleImageUpload = async (isPrimary: boolean, index?: number) => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            quality: 0.8,
            includeBase64: true,
        });

        if (result.didCancel || !result.assets?.[0]?.uri) return;

        const asset = result.assets[0];
        const uri = asset.uri!;
        const base64 = asset.base64;

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
            // Real upload to Supabase Storage
            const uploadUri = await uploadProfileImage(user!.id, uri, base64 || undefined);

            if (isPrimary) {
                setPrimaryPhoto({ uri: uploadUri, uploading: false });
            } else {
                setAdditionalPhotos(prev => {
                    const updated = [...prev];
                    const photoIndex = index !== undefined ? index : updated.length - 1;
                    if (updated[photoIndex]) {
                        updated[photoIndex] = { uri: uploadUri, uploading: false };
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

    const handleSave = async () => {
        if (!validateForm()) return;
        if (!user?.id) {
            Alert.alert('Error', 'User ID not found');
            return;
        }

        setIsLoading(true);
        try {
            const finalPhotos = [primaryPhoto!.uri, ...additionalPhotos.map(p => p.uri)];

            const updatedProfile = {
                ...user,
                id: user.id, // Explicitly set and ensure it's a string
                email: user.email,
                username: username.toLowerCase(),
                full_name: fullName || username,
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
                city: hometown,
                last_active: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('profiles')
                .upsert(updatedProfile);

            if (error) throw error;

            setUser(updatedProfile);
            Alert.alert('Success', 'Profile updated successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Update Failed', error.message || 'Something went wrong');
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
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit Profile</Text>
                    <TouchableOpacity onPress={handleSave} disabled={isLoading}>
                        {isLoading ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <Text style={[styles.saveText, { color: theme.colors.primary }]}>Save</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
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

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                                placeholder="Enter your full name"
                                placeholderTextColor={theme.colors.textMuted}
                                value={fullName}
                                onChangeText={setFullName}
                            />
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
                            <Text style={styles.label}>Gender</Text>
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
                    <SectionHeader title="Photos" icon="camera-outline" />
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
                    </View>

                    {/* Bio */}
                    <SectionHeader title="About You" icon="create-outline" />
                    <View style={styles.section}>
                        <View style={styles.inputGroup}>
                            <View style={[styles.bioContainer, { backgroundColor: theme.colors.surface }]}>
                                <TextInput
                                    style={[styles.bioInput, { color: theme.colors.text }]}
                                    placeholder="Tell others about yourself..."
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

                    {/* Habits */}
                    <SectionHeader title="Habits" icon="cafe-outline" />
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
                    <SectionHeader title="Location & School" icon="school-outline" />
                    <View style={styles.section}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Hometown</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                                placeholder="Your hometown"
                                placeholderTextColor={theme.colors.textMuted}
                                value={hometown}
                                onChangeText={setHometown}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>School</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                                placeholder="School name"
                                placeholderTextColor={theme.colors.textMuted}
                                value={school}
                                onChangeText={setSchool}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>College</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}
                                placeholder="College name"
                                placeholderTextColor={theme.colors.textMuted}
                                value={college}
                                onChangeText={setCollege}
                            />
                        </View>
                    </View>
                    
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        <LinearGradient
                            colors={theme.colors.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.saveGradient}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Changes</Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 4,
    },
    saveText: {
        fontSize: 16,
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 20,
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
        fontSize: 18,
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
        paddingVertical: 12,
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
        height: 48,
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
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    primaryPhotoContainer: {
        width: '100%',
        height: 200,
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
        top: 10,
        right: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    removeButtonSmall: {
        position: 'absolute',
        top: 2,
        right: 2,
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
    bioContainer: {
        borderRadius: 16,
        padding: 12,
        minHeight: 100,
    },
    bioInput: {
        fontSize: 16,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    charLimit: {
        fontSize: 12,
        color: '#A0A0B0',
        textAlign: 'right',
        marginTop: 4,
    },
    habitOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    habitPill: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveButton: {
        marginTop: 32,
        borderRadius: 25,
        overflow: 'hidden',
    },
    saveGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#ff4444',
        fontSize: 12,
        marginLeft: 4,
    },
});

export default EditProfileScreen;
