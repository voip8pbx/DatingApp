import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import { useAuthStore } from '../store';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../supabase';

interface SignupScreenProps {
    navigation: any;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { setUser } = useAuthStore();

    const handleSignup = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        // Simulate signup - in production, this would call Supabase
        setTimeout(() => {
            setIsLoading(false);
            // Navigate to profile setup
            navigation.navigate('ProfileSetup');
        }, 1000);
    };

    const handleGoogleSignup = async () => {
        try {
            setIsLoading(true);
            await GoogleSignin.hasPlayServices();
            const response = await GoogleSignin.signIn();
            const idToken = response.data?.idToken;

            if (!idToken) {
                throw new Error('No idToken received');
            }

            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: idToken,
            });

            if (error) throw error;

            if (data.user) {
                // Navigate to profile setup or home
                navigation.navigate('ProfileSetup');
            }
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // user cancelled the login flow
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // operation (e.g. sign in) is in progress already
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                Alert.alert('Error', 'Play services not available or outdated');
            } else {
                Alert.alert('Error', error.message || 'Google sign in failed');
                console.error('Google Sign-in Error:', error);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Icon name="arrow-back" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join the vibe</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
                            <Icon name="person-outline" size={20} color={theme.colors.textMuted} />
                            <TextInput
                                placeholder="Full Name"
                                placeholderTextColor={theme.colors.textMuted}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                style={[styles.input, { color: theme.colors.text }]}
                            />
                        </View>

                        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
                            <Icon name="mail-outline" size={20} color={theme.colors.textMuted} />
                            <TextInput
                                placeholder="Email"
                                placeholderTextColor={theme.colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={[styles.input, { color: theme.colors.text }]}
                            />
                        </View>

                        <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
                            <Icon name="lock-closed-outline" size={20} color={theme.colors.textMuted} />
                            <TextInput
                                placeholder="Password"
                                placeholderTextColor={theme.colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                style={[styles.input, { color: theme.colors.text }]}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Icon
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={theme.colors.textMuted}
                                />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.terms}>
                            By signing up, you agree to our{' '}
                            <Text style={styles.link}>Terms of Service</Text> and{' '}
                            <Text style={styles.link}>Privacy Policy</Text>
                        </Text>

                        <TouchableOpacity
                            style={styles.signupButton}
                            onPress={handleSignup}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={theme.colors.gradient as [string, string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.signupButtonText}>
                                    {isLoading ? 'Creating...' : 'Create Account'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.divider}>
                            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                            <Text style={[styles.dividerText, { color: theme.colors.textMuted }]}>
                                OR
                            </Text>
                            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                        </View>

                        <TouchableOpacity
                            style={[styles.socialButton, { backgroundColor: theme.colors.surface }]}
                            onPress={handleGoogleSignup}
                            disabled={isLoading}
                        >
                            <Icon name="logo-google" size={20} color="#EA4335" />
                            <Text style={[styles.socialButtonText, { color: theme.colors.text }]}>
                                Continue with Google
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Sign In Link */}
                    <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.signInText}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    header: {
        marginBottom: 40,
    },
    backButton: {
        marginBottom: 20,
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
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    terms: {
        color: '#A0A0B0',
        fontSize: 12,
        lineHeight: 18,
    },
    link: {
        color: '#FF3CAC',
    },
    signupButton: {
        marginTop: 16,
    },
    gradientButton: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    signupButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
    },
    footerText: {
        color: '#A0A0B0',
        fontSize: 16,
    },
    signInText: {
        color: '#FF3CAC',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        paddingHorizontal: 12,
        fontSize: 14,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    socialButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default SignupScreen;
