import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { format } from 'date-fns';

import { useTheme } from '../hooks/useTheme';
import { useChatStore } from '../store';
import { Match, Message } from '../types';

interface ChatRoomScreenProps {
    route: { params: { match: Match } };
    navigation: any;
}

const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({ route, navigation }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { match } = route.params;
    const profile = match.other_user;

    const [messageText, setMessageText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    const {
        messages,
        loadMessages,
        sendMessage,
        markAsRead,
        isLoading,
    } = useChatStore();

    const matchMessages = messages[match.id] || [];

    useEffect(() => {
        loadMessages(match.id);
        markAsRead(match.id);
    }, [match.id]);

    const handleSend = async () => {
        if (!messageText.trim()) return;
        await sendMessage(match.id, messageText.trim());
        setMessageText('');
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isSender = item.sender_id === 'current-user';
        const showTime = index === 0 ||
            new Date(matchMessages[index - 1].created_at).getTime() - new Date(item.created_at).getTime() > 300000;

        return (
            <View style={[
                styles.messageContainer,
                isSender ? styles.senderContainer : styles.receiverContainer
            ]}>
                {!isSender && (
                    <Image
                        source={{ uri: profile?.profile_photos[0] }}
                        style={styles.messageAvatar}
                    />
                )}
                <View style={[
                    styles.messageBubble,
                    isSender
                        ? { backgroundColor: theme.colors.primary }
                        : { backgroundColor: theme.colors.surface }
                ]}>
                    <Text style={[
                        styles.messageText,
                        { color: isSender ? theme.colors.white : theme.colors.text }
                    ]}>
                        {item.content}
                    </Text>
                    <View style={styles.messageMeta}>
                        <Text style={[
                            styles.messageTime,
                            { color: isSender ? 'rgba(255,255,255,0.6)' : theme.colors.textMuted }
                        ]}>
                            {format(new Date(item.created_at), 'HH:mm')}
                        </Text>
                        {isSender && (
                            <Icon
                                name={item.is_read ? 'checkmark-done' : 'checkmark'}
                                size={14}
                                color="rgba(255,255,255,0.6)"
                            />
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.colors.surface }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.headerUser}>
                    <Image
                        source={{ uri: profile?.profile_photos[0] }}
                        style={styles.headerAvatar}
                    />
                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerName, { color: theme.colors.text }]}>
                            {profile?.full_name}
                        </Text>
                        <Text style={[styles.headerStatus, { color: theme.colors.online }]}>
                            Online
                        </Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.callButton}>
                    <Icon name="videocam" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={matchMessages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            {/* Input */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <View style={[
                    styles.inputContainer,
                    {
                        backgroundColor: theme.colors.surface,
                        paddingBottom: insets.bottom + 10,
                    }
                ]}>
                    <TouchableOpacity style={styles.emojiButton}>
                        <Icon name="happy-outline" size={24} color={theme.colors.textMuted} />
                    </TouchableOpacity>

                    <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceElevated }]}>
                        <TextInput
                            value={messageText}
                            onChangeText={setMessageText}
                            placeholder="Type a message..."
                            placeholderTextColor={theme.colors.textMuted}
                            style={[styles.input, { color: theme.colors.text }]}
                            multiline
                            maxLength={500}
                        />
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            { backgroundColor: messageText.trim() ? theme.colors.primary : theme.colors.surfaceElevated }
                        ]}
                        onPress={handleSend}
                        disabled={!messageText.trim()}
                    >
                        <Icon
                            name="send"
                            size={20}
                            color={messageText.trim() ? theme.colors.white : theme.colors.textMuted}
                        />
                    </TouchableOpacity>
                </View>
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
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 12,
    },
    backButton: {
        padding: 4,
    },
    headerUser: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    headerInfo: {
        gap: 2,
    },
    headerName: {
        fontSize: 16,
        fontWeight: '600',
    },
    headerStatus: {
        fontSize: 12,
    },
    callButton: {
        padding: 8,
    },
    messagesList: {
        padding: 16,
        gap: 8,
    },
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
    },
    senderContainer: {
        justifyContent: 'flex-end',
    },
    receiverContainer: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    messageBubble: {
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    messageMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        marginTop: 4,
    },
    messageTime: {
        fontSize: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 10,
        gap: 8,
    },
    emojiButton: {
        padding: 4,
    },
    inputWrapper: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        maxHeight: 100,
    },
    input: {
        fontSize: 15,
        maxHeight: 80,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ChatRoomScreen;
