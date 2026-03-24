import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
    PermissionsAndroid,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, MapType, Region, Marker, Callout } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme, useIsDark } from '../hooks/useTheme';
import { useMatchedUsersLocations } from '../hooks/useMatchedUsersLocations';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { useFocusEffect } from '@react-navigation/native';
import { Image as RNImage } from 'react-native';

// Default map region (Near Delhi)
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
    const [mapType, setMapType] = useState<MapType>('standard');
    const [isSatelliteManual, setIsSatelliteManual] = useState<boolean>(false);
    
    // Fetch other active users
    const { matchedLocations } = useMatchedUsersLocations();
    const { startTracking, stopTracking } = useLocationTracking();

    useFocusEffect(
        React.useCallback(() => {
            startTracking();
            return () => stopTracking();
        }, [startTracking, stopTracking])
    );

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
                {matchedLocations.map((user) => (
                    <Marker
                        key={user.user_id}
                        coordinate={{ latitude: user.latitude, longitude: user.longitude }}
                        tracksViewChanges={false}
                    >
                        <View style={styles.markerWrapper}>
                            <RNImage
                                source={{ uri: user.profile.avatar_url || 'https://i.pravatar.cc/150' }}
                                style={styles.markerAvatar}
                            />
                            <View style={[
                                styles.markerStatusDot, 
                                { backgroundColor: user.isOnline ? '#22C55E' : '#94A3B8' }
                            ]} />
                        </View>
                        <Callout>
                            <View style={styles.calloutWrapper}>
                                <View style={[styles.calloutBody, { backgroundColor: theme.colors.surface }]}>
                                    <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>
                                        {user.profile.full_name}
                                    </Text>
                                    <View style={styles.statusRow}>
                                        <View style={[
                                            styles.statusDot, 
                                            { backgroundColor: user.isOnline ? '#22C55E' : '#94A3B8' }
                                        ]} />
                                        <Text style={[styles.calloutSub, { color: theme.colors.textSecondary }]}>
                                            {user.isOnline ? 'Online now' : 'Seen recently'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>
            


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

            {/* Overlay Header */}
            <View style={[styles.overlayHeader, { backgroundColor: theme.colors.surface + 'D9' }]}>
                <Text style={[styles.overlayTitle, { color: theme.colors.text }]}>Discover Nearby</Text>
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
