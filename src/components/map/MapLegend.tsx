import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';

interface MapLegendProps {
    onlineCount: number;
    totalCount: number;
}

const MapLegend: React.FC<MapLegendProps> = ({ onlineCount, totalCount }) => {
    const theme = useTheme();

    if (totalCount === 0) {
        return null;
    }

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                },
            ]}
        >
            <Text style={[styles.text, { color: theme.colors.text }]}>
                👥 {totalCount} {totalCount === 1 ? 'friend' : 'friends'} on the map
            </Text>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.onlineContainer}>
                <View style={[styles.onlineDot, { backgroundColor: theme.colors.online }]} />
                <Text style={[styles.text, { color: theme.colors.text }]}>
                    {onlineCount} {onlineCount === 1 ? 'online' : 'online now'}
                </Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100, // Above tab bar
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    text: {
        fontSize: 13,
        fontWeight: '500',
    },
    divider: {
        width: 1,
        height: 16,
        marginHorizontal: 12,
    },
    onlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
});

export default MapLegend;
