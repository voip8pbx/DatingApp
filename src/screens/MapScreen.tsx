import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, MapType, Region } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme, useIsDark } from '../hooks/useTheme';


// Interface for Mock User
export interface MapMockUser {
    id: string;
    name: string;
    status: string;
    latitude: number;
    longitude: number;
    type: 'online' | 'away' | 'busy' | 'offline';
    avatarUrl: string;
}

// Mock users across India (Focusing on Delhi)
const MOCK_USERS: MapMockUser[] = [
    // Delhi Region (approx 35 users)
    { id: '1', name: 'Rahul Sharma', status: 'Coffee at CP? ☕', latitude: 28.6328, longitude: 77.2197, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=1' },
    { id: '2', name: 'Priya Mehra', status: 'Exploring Hauz Khas ✨', latitude: 28.5494, longitude: 77.2001, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=2' },
    { id: '3', name: 'Aman Gupta', status: 'Gymming 💪', latitude: 28.6219, longitude: 77.0878, type: 'busy', avatarUrl: 'https://i.pravatar.cc/150?u=3' },
    { id: '4', name: 'Sneha Rao', status: 'Weekend state of mind 🏖️', latitude: 28.5244, longitude: 77.1855, type: 'away', avatarUrl: 'https://i.pravatar.cc/150?u=4' },
    { id: '5', name: 'Vikrant Singh', status: 'Driving through NK 🚗', latitude: 28.6692, longitude: 77.2323, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=5' },
    { id: '6', name: 'Anjali Das', status: 'Work mode on 💻', latitude: 28.5823, longitude: 77.2273, type: 'busy', avatarUrl: 'https://i.pravatar.cc/150?u=6' },
    { id: '7', name: 'Ishita Kapoor', status: 'Best momos in GK! 🥟', latitude: 28.5482, longitude: 77.2400, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=7' },
    { id: '8', name: 'Karan Malhotra', status: 'Cycling in Lodhi Garden 🚲', latitude: 28.5933, longitude: 77.2189, type: 'away', avatarUrl: 'https://i.pravatar.cc/150?u=8' },
    { id: '9', name: 'Arjun Verma', status: 'Netflix & Chill 🍿', latitude: 28.4595, longitude: 77.0266, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=9' },
    { id: '10', name: 'Riya Soni', status: 'Shopping in CyberHub 🛍️', latitude: 28.4950, longitude: 77.0878, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=10' },
    { id: '11', name: 'Sameer Khan', status: 'Late night cravings 🍔', latitude: 28.5355, longitude: 77.3910, type: 'away', avatarUrl: 'https://i.pravatar.cc/150?u=11' },
    { id: '12', name: 'Zoya Ahmed', status: 'Stuck in traffic 😫', latitude: 28.5700, longitude: 77.3000, type: 'busy', avatarUrl: 'https://i.pravatar.cc/150?u=12' },
    { id: '13', name: 'Aryan Goel', status: 'New project launch! 🚀', latitude: 28.7041, longitude: 77.1025, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=13' },
    { id: '14', name: 'Mehak Jain', status: 'Catching up on sleep 😴', latitude: 28.6139, longitude: 77.2090, type: 'offline', avatarUrl: 'https://i.pravatar.cc/150?u=14' },
    { id: '15', name: 'Tushar Negi', status: 'Trekking soon ⛰️', latitude: 28.6500, longitude: 77.1500, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=15' },
    { id: '16', name: 'Tanvi Shah', status: 'Art gallery visit 🖼️', latitude: 28.5500, longitude: 77.2500, type: 'away', avatarUrl: 'https://i.pravatar.cc/150?u=16' },
    { id: '17', name: 'Rohan Joshi', status: 'Gaming all night 🎮', latitude: 28.6000, longitude: 77.1000, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=17' },
    { id: '18', name: 'Shruti Misra', status: 'Reading by the window 📖', latitude: 28.5200, longitude: 77.2200, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=18' },
    { id: '19', name: 'Aditya Pal', status: 'Cricket match tonight! 🏏', latitude: 28.6300, longitude: 77.2800, type: 'busy', avatarUrl: 'https://i.pravatar.cc/150?u=19' },
    { id: '20', name: 'Navya Reddy', status: 'Yoga is life 🧘‍♀️', latitude: 28.4800, longitude: 77.0500, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=20' },
    { id: '21', name: 'Kabir Batra', status: 'Brewery hopping 🍺', latitude: 28.6400, longitude: 77.1200, type: 'away', avatarUrl: 'https://i.pravatar.cc/150?u=21' },
    { id: '22', name: 'Kyra Sethi', status: 'Missing the beach 🌊', latitude: 28.5600, longitude: 77.2100, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=22' },
    { id: '23', name: 'Manav Kohli', status: 'Work from cafe ☕', latitude: 28.5800, longitude: 77.3200, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=23' },
    { id: '24', name: 'Avni Bansal', status: 'Baking therapy 🍰', latitude: 28.6800, longitude: 77.1800, type: 'busy', avatarUrl: 'https://i.pravatar.cc/150?u=24' },
    { id: '25', name: 'Siddharth Roy', status: 'Coding my dreams 👨‍💻', latitude: 28.4700, longitude: 77.0100, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=25' },
    { id: '26', name: 'Tara Khanna', status: 'Dog park fun 🐶', latitude: 28.5100, longitude: 77.2700, type: 'away', avatarUrl: 'https://i.pravatar.cc/150?u=26' },
    { id: '27', name: 'Varun Dhawan', status: 'Vibing to Punjabi music 🎵', latitude: 28.6200, longitude: 77.1600, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=27' },
    { id: '28', name: 'Nupur Garg', status: 'Sushi night! 🍣', latitude: 28.5900, longitude: 77.2400, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=28' },
    { id: '29', name: 'Yash Vardhan', status: 'Gym motivation 💯', latitude: 28.6500, longitude: 77.0800, type: 'busy', avatarUrl: 'https://i.pravatar.cc/150?u=29' },
    { id: '30', name: 'Esha Deol', status: 'Living in the moment', latitude: 28.5300, longitude: 77.1900, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=30' },
    { id: '31', name: 'Pranav Chopra', status: 'Photography walk 📸', latitude: 28.6100, longitude: 77.2300, type: 'away', avatarUrl: 'https://i.pravatar.cc/150?u=31' },
    { id: '32', name: 'Sanya Malhotra', status: 'Dance practice 💃', latitude: 28.5700, longitude: 77.2200, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=32' },
    { id: '33', name: 'Udit Narayan', status: 'Singing my heart out 🎤', latitude: 28.6700, longitude: 77.2600, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=33' },
    { id: '34', name: 'Vanya Grover', status: 'Plant mom 🪴', latitude: 28.5400, longitude: 77.1700, type: 'busy', avatarUrl: 'https://i.pravatar.cc/150?u=34' },
    { id: '35', name: 'Dhruv Rathee', status: 'New video dropping 🎥', latitude: 28.6000, longitude: 77.0600, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=35' },

    // Other Cities in India (approx 15 users)
    { id: '36', name: 'Amitabh B', status: 'Mumbai Meri Jaan ❤️', latitude: 19.0760, longitude: 72.8777, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=36' }, // Mumbai
    { id: '37', name: 'Deepika P', status: 'Bangalore traffic... 😤', latitude: 12.9716, longitude: 77.5946, type: 'away', avatarUrl: 'https://i.pravatar.cc/150?u=37' }, // Bangalore
    { id: '38', name: 'Sourav G', status: 'Kolkata rains 🌧️', latitude: 22.5726, longitude: 88.3639, type: 'busy', avatarUrl: 'https://i.pravatar.cc/150?u=38' }, // Kolkata
    { id: '39', name: 'Mahesh B', status: 'Hyderabad Biryani! 🥘', latitude: 17.3850, longitude: 78.4867, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=39' }, // Hyderabad
    { id: '40', name: 'Rajini K', status: 'Chennai super kings! 🏏', latitude: 13.0827, longitude: 80.2707, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=40' }, // Chennai
    { id: '41', name: 'Diljit D', status: 'Chandigarh di gedi 🚙', latitude: 30.7333, longitude: 76.7794, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=41' }, // Chandigarh
    { id: '42', name: 'Hardik P', status: 'Ahmedabad vibes', latitude: 23.0225, longitude: 72.5714, type: 'away', avatarUrl: 'https://i.pravatar.cc/150?u=42' }, // Ahmedabad
    { id: '43', name: 'MS Dhoni', status: 'Ranchi boy 🤘', latitude: 23.3441, longitude: 85.3096, type: 'offline', avatarUrl: 'https://i.pravatar.cc/150?u=43' }, // Ranchi
    { id: '44', name: 'Virat K', status: 'Dilli se hoon bc! 🦁', latitude: 28.6139, longitude: 77.2090, type: 'busy', avatarUrl: 'https://i.pravatar.cc/150?u=44' }, // Delhi again
    { id: '45', name: 'Rohit S', status: 'Vada Pav lover 🌮', latitude: 19.2183, longitude: 72.9781, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=45' }, // Thane
    { id: '46', name: 'KL Rahul', status: 'Silent mode 🤐', latitude: 15.3173, longitude: 75.7139, type: 'away', avatarUrl: 'https://i.pravatar.cc/150?u=46' }, // Karnataka
    { id: '47', name: 'Jasprit B', status: 'Yorker King 👑', latitude: 22.3072, longitude: 73.1812, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=47' }, // Vadodara
    { id: '48', name: 'Rishabh P', status: 'Comeback stronger 💪', latitude: 30.3165, longitude: 78.0322, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=48' }, // Dehradun
    { id: '49', name: 'Shubman G', status: 'Prince of Ahmedabad 👑', latitude: 23.0333, longitude: 72.5667, type: 'online', avatarUrl: 'https://i.pravatar.cc/150?u=49' }, // Ahmedabad
    { id: '50', name: 'Smriti M', status: 'Leftie power 🏏', latitude: 19.0330, longitude: 73.0297, type: 'busy', avatarUrl: 'https://i.pravatar.cc/150?u=50' }, // Navi Mumbai
];

// Focus on North/Central India (Center: Near Delhi)
const DELHI_REGION = {
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 5.0,
    longitudeDelta: 5.0,
};

const MapScreen: React.FC = () => {
    const theme = useTheme();
    const isDark = useIsDark();
    const mapRef = useRef<MapView>(null);
    const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<MapMockUser | null>(null);
    const [mapType, setMapType] = useState<MapType>('standard');
    const [isSatelliteManual, setIsSatelliteManual] = useState<boolean>(false);

    useEffect(() => {
        checkPermissionAndInitialize();
    }, []);

    const checkPermissionAndInitialize = async () => {
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'Sparq needs your location to show you on the map and find matches nearby.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                
                if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    setHasPermission(true);
                    getUserCurrentLocation();
                } else {
                    setHasPermission(false);
                    Alert.alert(
                        'Permission Denied', 
                        'Location access is required to see your position. You can enable it in device settings.',
                        [{ text: 'OK' }]
                    );
                }
            } else {
                // iOS logic
                Geolocation.requestAuthorization();
                setHasPermission(true);
                getUserCurrentLocation();
            }
        } catch (err) {
            console.warn(err);
        }
    };

    const getUserCurrentLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation({ latitude, longitude });
                
                // Zoom to user on load
                mapRef.current?.animateToRegion({
                    latitude,
                    longitude,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                }, 1000);
            },
            (error) => {
                console.warn('Location error:', error.message);
                // If location fails, we silently default to the initial view (Delhi)
                // Don't alert here as it might be annoying on every load
            },
            { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
        );
    };

    // Auto-switch to satellite/hybrid when user zooms in close enough
    const handleRegionChangeComplete = (region: Region) => {
        if (!isSatelliteManual) {
            if (region.latitudeDelta < 0.05) {
                setMapType('hybrid');
            } else {
                setMapType('standard');
            }
        }
    };

    const toggleSatellite = () => {
        setIsSatelliteManual(prev => {
            const nextManual = !prev;
            if (nextManual) {
                setMapType('hybrid');
            } else {
                setMapType('standard');
            }
            return nextManual;
        });
    };

    const getStatusColor = (type: MapMockUser['type']) => {
        switch (type) {
            case 'online': return '#4CAF50';
            case 'away': return '#FFC107';
            case 'busy': return '#F44336';
            default: return '#9E9E9E';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <MapView
                provider={PROVIDER_GOOGLE}
                ref={mapRef}
                style={styles.map}
                initialRegion={DELHI_REGION}
                showsUserLocation={hasPermission}
                showsMyLocationButton={false}
                mapType={mapType}
                customMapStyle={mapType === 'standard' && isDark ? darkMapStyle : []}
                onRegionChangeComplete={handleRegionChangeComplete}
            >
                {/* Mock User Markers */}
                {MOCK_USERS.map((user) => (
                    <Marker
                        key={user.id}
                        identifier={user.id}
                        coordinate={{ latitude: user.latitude, longitude: user.longitude }}
                        onPress={(e) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                        }}
                        tracksViewChanges={false}
                    >
                        <View style={[
                            styles.markerWrapper,
                            { borderColor: user.type === 'online' ? '#FF6B6B' : user.type === 'away' ? '#FFC107' : user.type === 'busy' ? '#F44336' : '#9E9E9E' }
                        ]}>
                            <Image
                                source={{ uri: user.avatarUrl }}
                                style={styles.markerAvatar}
                            />
                            <View style={[
                                styles.markerStatusDot,
                                { backgroundColor: user.type === 'online' ? '#4CAF50' : user.type === 'away' ? '#FFC107' : user.type === 'busy' ? '#F44336' : '#9E9E9E' }
                            ]} />
                        </View>
                    </Marker>
                ))}
            </MapView>
            
            {/* Custom Callout / User Detail (Since MapLibre handles popups differently, we'll use a floating card) */}
            {selectedUser && (
                <TouchableOpacity 
                    style={[styles.floatingCallout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => setSelectedUser(null)}
                    activeOpacity={0.9}
                >
                    <View style={styles.calloutBody}>
                        <View style={styles.calloutHeader}>
                            <View style={styles.profileRow}>
                                <Image 
                                    source={{ uri: selectedUser.avatarUrl }} 
                                    style={styles.detailAvatar} 
                                />
                                <View>
                                    <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>{selectedUser.name}</Text>
                                    <View style={styles.statusRow}>
                                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedUser.type) }]} />
                                        <Text style={[styles.calloutSub, { color: theme.colors.textSecondary }]}>
                                            {selectedUser.type.charAt(0).toUpperCase() + selectedUser.type.slice(1)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedUser(null)}>
                                <Icon name="close" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                        <Text style={[styles.calloutStatus, { color: theme.colors.text }]}>"{selectedUser.status}"</Text>
                    </View>
                </TouchableOpacity>
            )}

            {/* Satellite Toggle Button */}
            <TouchableOpacity
                style={[
                    styles.floatingButton,
                    styles.satelliteButton,
                    { backgroundColor: isSatelliteManual ? theme.colors.primary : theme.colors.surface },
                ]}
                onPress={toggleSatellite}
            >
                <Icon
                    name={isSatelliteManual ? 'earth' : 'earth-outline'}
                    size={24}
                    color={isSatelliteManual ? '#fff' : theme.colors.primary}
                />
            </TouchableOpacity>

            {/* Recenter / My Location Button */}
            <TouchableOpacity 
                style={[styles.floatingButton, { backgroundColor: theme.colors.surface }]}
                onPress={getUserCurrentLocation}
            >
                <Icon name="locate" size={24} color={theme.colors.primary} />
            </TouchableOpacity>

            {/* Legend / Overlay Header */}
            <View style={[styles.overlayHeader, { backgroundColor: theme.colors.surface + 'D9' }]}>
                <Text style={[styles.overlayTitle, { color: theme.colors.text }]}>Discover Near Delhi & India</Text>
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                        <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Online</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.statusDot, { backgroundColor: '#FFC107' }]} />
                        <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Away</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.statusDot, { backgroundColor: '#F44336' }]} />
                        <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>Busy</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

// Optional Dark mode style for Google Maps
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    markerWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    markerAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
    },
    markerStatusDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    statusIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        position: 'absolute',
        top: 2,
        right: 2,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    calloutWrapper: {
        width: 200,
        padding: 0,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    calloutBody: {
        padding: 12,
        alignItems: 'flex-start',
    },
    calloutTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    calloutSub: {
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 8,
    },
    calloutStatus: {
        fontSize: 13,
        fontStyle: 'italic',
        lineHeight: 18,
    },
    calloutArrow: {
        bottom: -5,
        alignSelf: 'center',
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    floatingButton: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    satelliteButton: {
        bottom: 100,
    },
    overlayHeader: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    overlayTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendText: {
        fontSize: 11,
        fontWeight: '600',
    },
    floatingCallout: {
        position: 'absolute',
        bottom: 100,
        left: 20,
        right: 20,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    calloutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    detailAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#eee',
    },
});

export default MapScreen;
