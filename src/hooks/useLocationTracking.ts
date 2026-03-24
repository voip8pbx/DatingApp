import { useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useLocationStore } from '../store/locationStore';
import { supabase } from '../supabase';

const LOCATION_UPDATE_INTERVAL = 15000; // 15 seconds
const LOCATION_FASTEST_INTERVAL = 10000; // 10 seconds
const LOCATION_DISTANCE_FILTER = 10; // 10 meters

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

    const publishLocation = useCallback(async (latitude: number, longitude: number, heading?: number) => {
        try {
            const { data, error: userError } = await supabase.auth.getUser();
            if (userError || !data?.user) {
                console.log('No active session or error getting user');
                return;
            }
            const user = data.user;

            const { error: upsertError } = await supabase.from('user_locations').upsert({
                id: user.id,
                user_id: user.id,
                latitude,
                longitude,
                heading: heading || null,
                updated_at: new Date().toISOString(),
            });

            if (upsertError) {
                console.error('Error upserting location:', upsertError);
                return;
            }

            // Update local store
            setCurrentLocation({ latitude, longitude, heading });
        } catch (error) {
            console.error('Error publishing location:', error);
        }
    }, [setCurrentLocation]);

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

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (watchId.current !== null) {
                Geolocation.clearWatch(watchId.current);
            }
        };
    }, []);

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
