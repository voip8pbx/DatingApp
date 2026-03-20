import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    TextInput,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { format, formatDistanceToNow } from 'date-fns';

import { useTheme } from '../hooks/useTheme';
import { useMatchStore, useChatStore } from '../store';
import { Match } from '../types';

const ChatItem: React.FC<{ match: Match; onPress: () => void }> = ({ match, onPress }) => {
    const theme = useTheme();
    const profile = match.other_user;
    const { unreadCounts } = useChatStore();
    const unread = unreadCounts[match.id] || 0;

    if (!profile) return null;

    return (
        <TouchableOpacity style={styles.chatItem} onPress={onPress}>
            <View style={styles.avatarContainer}>
                <Image source={{ uri: profile.profile_photos[0] }} style={styles.avatar} />
                <View style={[styles.onlineIndicator, { backgroundColor: theme.colors.online }]} />
            </View>

            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{profile.full_name}</Text>
                    <Text style={styles.chatTime}>
                        {formatDistanceToNow(new Date(match.created_at), { addSuffix: true })}
                    </Text>
                </View>
                <View style={styles.chatPreview}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {match.last_message?.content || 'Say hello!'}
                    </Text>
                    {unread > 0 && (
                        <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
                            <Text style={styles.unreadCount}>{unread}</Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
};

const ChatListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { matches, loadMatches } = useMatchStore();

    useEffect(() => {
        loadMatches();
    }, []);

    const renderHeader = () => (
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
            <Icon name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
                placeholder="Search conversations"
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.searchInput, { color: theme.colors.text }]}
            />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <Text style={styles.headerTitle}>Chats</Text>
            </View>

            {renderHeader()}

            {matches.length === 0 ? (
                <View style={styles.emptyState}>
                    <Icon name="chatbubbles-outline" size={80} color={theme.colors.textMuted} />
                    <Text style={styles.emptyTitle}>No conversations yet</Text>
                    <Text style={styles.emptySubtitle}>Match with someone to start chatting!</Text>
                </View>
            ) : (
                <FlatList
                    data={matches}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <ChatItem
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    listContent: {
        paddingBottom: 100,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: '#13131A',
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    chatTime: {
        fontSize: 12,
        color: '#A0A0B0',
    },
    chatPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 14,
        color: '#A0A0B0',
        flex: 1,
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadCount: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
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

export default ChatListScreen;
