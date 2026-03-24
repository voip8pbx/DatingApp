export type Gender = 'male' | 'female' | 'non-binary' | 'other';
export type SwipeDirection = 'like' | 'dislike' | 'superlike';
export type MessageType = 'text' | 'image' | 'gif' | 'emoji';

export interface Profile {
    id: string;
    email: string | null;
    username: string;
    full_name: string;
    age: number;
    gender: Gender;
    interested_gender: Gender[];
    height: number | null;
    height_unit: 'cm' | 'ft';
    religion: string | null;
    bio: string | null;
    drinking_habit: 'never' | 'occasionally' | 'regularly' | null;
    smoking_habit: 'never' | 'occasionally' | 'regularly' | null;
    hometown: string | null;
    school_name: string | null;
    college_name: string | null;
    location: string | null;
    city: string | null;
    profile_photos: string[];
    avatar_url: string | null;
    interests: string[];
    max_distance: number;
    age_min: number;
    age_max: number;
    is_premium: boolean;
    last_active: string;
    created_at: string;
    location_sharing_enabled: boolean;
    ghost_mode_enabled: boolean;
}

export interface Swipe {
    id: string;
    swiper_id: string;
    swiped_id: string;
    direction: SwipeDirection;
    created_at: string;
}

export interface Match {
    id: string;
    user1_id: string;
    user2_id: string;
    created_at: string;
    is_active: boolean;
    other_user?: Profile;
    last_message?: Message;
    unread_count?: number;
}

export interface Message {
    id: string;
    match_id: string;
    sender_id: string;
    content: string;
    message_type: MessageType;
    is_read: boolean;
    created_at: string;
    sender?: Profile;
}

export interface FilterPreferences {
    genders: Gender[];
    age_min: number;
    age_max: number;
    max_distance: number;
    interests: string[];
}

export interface DiscoveryFilters extends FilterPreferences {
    userId: string;
}

export interface AuthState {
    user: Profile | null;
    session: any | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export interface SwipeState {
    profiles: Profile[];
    currentIndex: number;
    filters: FilterPreferences;
    isLoading: boolean;
    hasMore: boolean;
}

export interface MatchState {
    matches: Match[];
    isLoading: boolean;
}

export interface ChatState {
    messages: Record<string, Message[]>;
    typingUsers: Record<string, string[]>;
    unreadCounts: Record<string, number>;
    isLoading: boolean;
}

export interface ThemeState {
    isDark: boolean;
    toggleTheme: () => void;
}

// Location types
export interface UserLocation {
    user_id: string;
    latitude: number;
    longitude: number;
    heading?: number;
    updated_at: string;
}

export interface MatchedUserLocation {
    user_id: string;
    latitude: number;
    longitude: number;
    heading?: number;
    updated_at: string;
    profile: {
        full_name: string;
        avatar_url: string;
        last_active: string;
    };
    isOnline: boolean;
}

export interface LocationState {
    // Current user
    currentLocation: { latitude: number; longitude: number; heading?: number } | null;
    permissionStatus: 'unknown' | 'granted' | 'denied';
    isTracking: boolean;
    // Matched users
    matchedLocations: MatchedUserLocation[];
    // Actions
    setCurrentLocation: (loc: LocationState['currentLocation']) => void;
    setPermissionStatus: (status: LocationState['permissionStatus']) => void;
    setIsTracking: (v: boolean) => void;
    upsertMatchedLocation: (loc: MatchedUserLocation) => void;
    removeMatchedLocation: (userId: string) => void;
    setMatchedLocations: (locs: MatchedUserLocation[]) => void;
}

export type RootStackParamList = {
    Splash: undefined;
    Onboarding: undefined;
    Login: undefined;
    Signup: undefined;
    ProfileSetup: undefined;
    Main: undefined;
    Filter: undefined;
    ProfileDetail: { profile: Profile };
    ChatRoom: { match: Match };
    EditProfile: undefined;
};

export type MainTabParamList = {
    Discover: undefined;
    Matches: undefined;
    Map: undefined;
    ChatList: undefined;
    Profile: undefined;
};
