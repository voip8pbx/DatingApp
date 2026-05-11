import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useLocationStore } from '../store/locationStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../supabase';

const LOCATION_UPDATE_INTERVAL = 5000; // 5 seconds for "live" feel
const LOCATION_FASTEST_INTERVAL = 3000; // 3 seconds
const LOCATION_DISTANCE_FILTER = 2; // 2 meters for smoother tracking

interface GeoPosition {
    coords: {
        latitude: number;
        longitude: number;
        heading: number | null;
        accuracy: number;
        altitude: number | null;
        speed: number | null;
    };
    timestamp: number;
}

interface GeoError {
    code: number;
    message: string;
}

export const useLocationTracking = () => {
    const watchId = useRef<number | null>(null);
    const {
        setCurrentLocation,
        setPermissionStatus,
        setIsTracking,
    } = useLocationStore();

    const requestPermissions = useCallback(async (): Promise<boolean> => {
        if (Platform.OS === 'ios') {
            // iOS permissions are handled automatically by MapLibre
            // But we can check the status
            return true;
        } else if (Platform.OS === 'android') {
            try {
                const fineLocation = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                        title: 'Location Permission',
                        message: 'We need access to your location to show you on the map and help you discover nearby matches.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );

                if (fineLocation === PermissionsAndroid.RESULTS.GRANTED) {
                    setPermissionStatus('granted');
                    return true;
                } else if (fineLocation === PermissionsAndroid.RESULTS.DENIED) {
                    setPermissionStatus('denied');
                    return false;
                } else if (fineLocation === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                    setPermissionStatus('denied');
                    return false;
                }
                return false;
            } catch (err) {
                console.warn('Error requesting location permissions:', err);
                return false;
            }
        }
        return false;
    }, [setPermissionStatus]);

    const { user: currentUserProfile } = useAuthStore();

    const publishLocation = useCallback(async (latitude: number, longitude: number, heading?: number) => {
        try {
            if (!currentUserProfile) {
                console.log('[LocationSync] No user profile in store, skipping publish');
                return;
            }

            if (!currentUserProfile.location_sharing_enabled) {
                console.log('[LocationSync] Location sharing is DISABLED in profile settings');
                return;
            }

            let finalLat = latitude;
            let finalLng = longitude;

            // Apply fuzzy location if ghost mode is enabled
            if (currentUserProfile.ghost_mode_enabled) {
                console.log('[LocationSync] Ghost mode is ENABLED, applying offset');
                // Add ±500m random offset (~0.009 degrees)
                finalLat = latitude + (Math.random() - 0.5) * 0.009;
                finalLng = longitude + (Math.random() - 0.5) * 0.009;
            }

            console.log(`[LocationSync] Publishing: ${finalLat.toFixed(6)}, ${finalLng.toFixed(6)} (Heading: ${heading || 'N/A'})`);

            const { error: upsertError } = await supabase
                .from('user_locations')
                .upsert(
                    {
                        user_id: currentUserProfile.id,
                        latitude: finalLat,
                        longitude: finalLng,
                        heading: heading || null,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id' }
                );

            if (upsertError) {
                console.error('[LocationSync] Supabase Upsert Error:', upsertError.message, upsertError.details);
                return;
            }

            console.log('[LocationSync] Successfully published location to Supabase');

            // Update local store
            setCurrentLocation({ latitude: finalLat, longitude: finalLng, heading });
        } catch (error) {
            console.error('[LocationSync] Publish error:', error);
        }
    }, [setCurrentLocation, currentUserProfile]);

    const startTracking = useCallback(async () => {
        if (watchId.current !== null) {
            return; // Already tracking
        }

        const hasPermission = await requestPermissions();
        if (!hasPermission) {
            Alert.alert(
                'Location Permission Required',
                'Please enable location permissions in your device settings to use this feature.',
                [{ text: 'OK' }]
            );
            return;
        }

        setIsTracking(true);

        watchId.current = Geolocation.watchPosition(
            (position: GeoPosition) => {
                const { latitude, longitude, heading } = position.coords;
                publishLocation(latitude, longitude, heading ?? undefined);
            },
            (error: GeoError) => {
                console.error('Geolocation error:', error);
                if (error.code === 1) { // Permission denied
                    setPermissionStatus('denied');
                    setIsTracking(false);
                }
            },
            {
                enableHighAccuracy: true,
                distanceFilter: LOCATION_DISTANCE_FILTER,
                interval: LOCATION_UPDATE_INTERVAL,
                fastestInterval: LOCATION_FASTEST_INTERVAL,
            }
        );
    }, [requestPermissions, publishLocation, setIsTracking, setPermissionStatus]);

    const stopTracking = useCallback(() => {
        if (watchId.current !== null) {
            Geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        setIsTracking(false);
    }, [setIsTracking]);

    const getCurrentPosition = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
        return new Promise((resolve) => {
            Geolocation.getCurrentPosition(
                (position: GeoPosition) => {
                    const { latitude, longitude } = position.coords;
                    resolve({ latitude, longitude });
                },
                (error: GeoError) => {
                    console.error('Error getting current position:', error);
                    resolve(null);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 10000,
                }
            );
        });
    }, []);

    // Handle AppState changes to resume tracking
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                console.log('[LocationSync] App became active, restarting tracking...');
                startTracking();
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
                console.log('[LocationSync] App moved to background');
                // We keep tracking if possible, or stop to save battery
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription.remove();
            if (watchId.current !== null) {
                Geolocation.clearWatch(watchId.current);
            }
        };
    }, [startTracking]);

    return {
        permissionStatus: useLocationStore((state) => state.permissionStatus),
        isTracking: useLocationStore((state) => state.isTracking),
        currentLocation: useLocationStore((state) => state.currentLocation),
        startTracking,
        stopTracking,
        getCurrentPosition,
    };
};

export default useLocationTracking;
