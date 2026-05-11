import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

import { useTheme } from '../hooks/useTheme';
import { useMatchStore } from '../store';
import { Match } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const MatchCard: React.FC<{ match: Match; onPress: () => void }> = ({ match, onPress }) => {
    const theme = useTheme();
    const profile = match.other_user;

    if (!profile) return null;

    return (
        <TouchableOpacity style={styles.matchCard} onPress={onPress}>
            <Image source={{ uri: profile.profile_photos[0] }} style={styles.matchImage} />
            <View style={styles.matchOverlay}>
                <Text style={styles.matchName}>{profile.full_name}</Text>
                <Text style={styles.matchAge}>{profile.age}</Text>
            </View>
            {profile.is_premium && (
                <View style={styles.premiumBadge}>
                    <Icon name="sparkles" size={12} color="#FFD700" />
                </View>
            )}
        </TouchableOpacity>
    );
};

const MatchesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { matches, loadMatches, isLoading } = useMatchStore();

    useEffect(() => {
        loadMatches();
    }, []);

    const renderNewMatches = () => {
        const newMatches = matches.slice(0, 5);
        if (newMatches.length === 0) return null;

        return (
            <View style={styles.newMatchesSection}>
                <Text style={styles.sectionTitle}>New Matches</Text>
                <FlatList
                    horizontal
                    data={newMatches}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.newMatchesList}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.newMatchItem}
                            onPress={() => navigation.navigate('ChatRoom', { match: item })}
                        >
                            <View style={styles.newMatchAvatar}>
                                <Image
                                    source={{ uri: item.other_user?.profile_photos[0] }}
                                    style={styles.avatarImage}
                                />
                                <View style={styles.onlineDot} />
                            </View>
                            <Text style={styles.newMatchName} numberOfLines={1}>
                                {item.other_user?.full_name.split(' ')[0]}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.headerTitle}>Matches</Text>
            </View>

            {matches.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="heart-outline" size={80} color={theme.colors.textMuted} />
                    <Text style={styles.emptyTitle}>No matches yet</Text>
                    <Text style={styles.emptySubtitle}>Keep swiping to find your vibe!</Text>
                </View>
            ) : (
                <FlatList
                    data={matches}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={renderNewMatches}
                    renderItem={({ item }) => (
                        <MatchCard
                            match={item}
                            onPress={() => navigation.navigate('ChatRoom', { match: item })}
                        />
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    newMatchesSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
        paddingHorizontal: 16,
    },
    newMatchesList: {
        paddingHorizontal: 16,
        gap: 16,
    },
    newMatchItem: {
        alignItems: 'center',
        marginRight: 16,
    },
    newMatchAvatar: {
        position: 'relative',
    },
    avatarImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: '#FF3CAC',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#00E5A0',
        borderWidth: 2,
        borderColor: '#13131A',
    },
    newMatchName: {
        marginTop: 8,
        fontSize: 12,
        color: '#fff',
        maxWidth: 64,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    matchCard: {
        width: CARD_WIDTH,
        height: CARD_WIDTH * 1.3,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#1C1C28',
    },
    matchImage: {
        width: '100%',
        height: '100%',
    },
    matchOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    matchName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    matchAge: {
        fontSize: 14,
        color: '#fff',
        opacity: 0.8,
    },
    premiumBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 6,
        borderRadius: 12,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
});

export default MatchesScreen;
