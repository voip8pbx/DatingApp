import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import { useTheme } from '../hooks/useTheme';

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const theme = useTheme();
    const logoScale = new Animated.Value(0);
    const logoOpacity = new Animated.Value(0);

    useEffect(() => {
        // Animate logo
        Animated.sequence([
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    friction: 4,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        // Navigate after delay
        const timer = setTimeout(() => {
            onFinish();
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={theme.colors.gradient as [string, string, string]}
                style={styles.gradient}
            >
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            transform: [{ scale: logoScale }],
                            opacity: logoOpacity,
                        },
                    ]}
                >
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoEmoji}>💜</Text>
                    </View>
                    <Text style={styles.logoText}>Vibe</Text>
                    <Text style={styles.tagline}>Find Your Match</Text>
                </Animated.View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    logoEmoji: {
        fontSize: 50,
    },
    logoText: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 2,
    },
    tagline: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
    },
});

export default SplashScreen;
