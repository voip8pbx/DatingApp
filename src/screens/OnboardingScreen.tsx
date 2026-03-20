import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
    onGetStarted: () => void;
}

const slides = [
    {
        id: 1,
        icon: 'heart',
        title: 'Find Your Vibe',
        description: 'Swipe right to like, left to pass. Discover people who match your energy.',
        color: '#FF3CAC',
    },
    {
        id: 2,
        icon: 'options',
        title: 'Filter Your World',
        description: 'Set your preferences - gender, age, distance, and interests. You\'re in control.',
        color: '#784BA0',
    },
    {
        id: 3,
        icon: 'chatbubbles',
        title: 'Chat & Connect',
        description: 'Match with someone special and start a conversation. Your story begins here.',
        color: '#2B86C5',
    },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onGetStarted }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onGetStarted();
        }
    };

    const handleSkip = () => {
        onGetStarted();
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            {/* Skip Button */}
            <TouchableOpacity
                style={[styles.skipButton, { paddingTop: insets.top + 10 }]}
                onPress={handleSkip}
            >
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            {/* Slides */}
            <View style={styles.slidesContainer}>
                {slides.map((slide, index) => (
                    index === currentSlide && (
                        <View
                            key={slide.id}
                            style={styles.slide}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: slide.color + '20' }]}>
                                <Icon name={slide.icon} size={80} color={slide.color} />
                            </View>
                            <Text style={styles.title}>{slide.title}</Text>
                            <Text style={styles.description}>{slide.description}</Text>
                        </View>
                    )
                ))}
            </View>

            {/* Indicators */}
            <View style={styles.indicators}>
                {slides.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.indicator,
                            index === currentSlide && styles.indicatorActive,
                        ]}
                    />
                ))}
            </View>

            {/* CTA Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <LinearGradient
                        colors={theme.colors.gradient as [string, string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
                        </Text>
                        <Icon name="arrow-forward" size={20} color={theme.colors.white} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    skipButton: {
        position: 'absolute',
        top: 0,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    skipText: {
        color: '#A0A0B0',
        fontSize: 16,
    },
    slidesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    slide: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#A0A0B0',
        textAlign: 'center',
        lineHeight: 24,
    },
    indicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 40,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2A2A3A',
    },
    indicatorActive: {
        width: 24,
        backgroundColor: '#FF3CAC',
    },
    footer: {
        paddingHorizontal: 24,
    },
    nextButton: {
        width: '100%',
    },
    gradientButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        gap: 8,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default OnboardingScreen;
