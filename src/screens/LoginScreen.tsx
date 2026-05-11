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

interface LoginScreenProps {
    navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { setUser } = useAuthStore();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                console.log('User signed in:', data.user.email);
            }
        } catch (error: any) {
            Alert.alert('Login Failed', error.message || 'Check your credentials');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
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
                console.log('User signed in successfully', data.user.email);
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

    const handleAppleLogin = () => {
        Alert.alert('Coming Soon', 'Apple login will be available soon!');
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
                        <Text style={styles.title}>Welcome Back</Text>
                        <Text style={styles.subtitle}>Sign in to continue</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
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

                        <TouchableOpacity style={styles.forgotPassword}>
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={theme.colors.gradient as [string, string, string]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.gradientButton}
                            >
                                <Text style={styles.loginButtonText}>
                                    {isLoading ? 'Signing in...' : 'Sign In'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Social Login */}
                    <View style={styles.socialSection}>
                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]}>
                            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                            <Text style={[styles.dividerText, { color: theme.colors.textMuted }]}>
                                or continue with
                            </Text>
                            <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                        </View>

                        <View style={styles.socialButtons}>
                            <TouchableOpacity
                                style={[styles.socialButton, { backgroundColor: theme.colors.surface }]}
                                onPress={handleGoogleLogin}
                            >
                                <Icon name="logo-google" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.socialButton, { backgroundColor: theme.colors.surface }]}
                                onPress={handleAppleLogin}
                            >
                                <Icon name="logo-apple" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Sign Up Link */}
                    <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                            <Text style={styles.signUpText}>Sign Up</Text>
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
    forgotPassword: {
        alignSelf: 'flex-end',
    },
    forgotText: {
        color: '#FF3CAC',
        fontSize: 14,
    },
    loginButton: {
        marginTop: 8,
    },
    gradientButton: {
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    socialSection: {
        marginTop: 40,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: 14,
    },
    socialButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    socialButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
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
    signUpText: {
        color: '#FF3CAC',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default LoginScreen;
