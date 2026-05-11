import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PermissionsAndroid,
  Animated,
  Image as RNImage,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '@env';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme, useIsDark } from '../hooks/useTheme';
import AvatarMarker from '../components/map/AvatarMarker';
import { useMatchedUsersLocations } from '../hooks/useMatchedUsersLocations';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { useFocusEffect } from '@react-navigation/native';

// Mapbox Token Configuration
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const MAP_STYLE_URL = 'mapbox://styles/voip8pbx/cmov894j1000b01qy2h1c4ssc';

// Default map region - Delhi coordinates
const DELHI_COORDS = [77.209, 28.6139]; // [longitude, latitude] for Mapbox

const MapScreen: React.FC = () => {
  const theme = useTheme();
  const isDark = useIsDark();
  const cameraRef = useRef<Mapbox.Camera>(null);
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapStyle, setMapStyle] = useState<string>(MAP_STYLE_URL);
  const [currentCoord, setCurrentCoord] = useState<[number, number] | null>(null);

  // Fetch other active users
  const { matchedLocations, refresh } = useMatchedUsersLocations();
  const { startTracking, stopTracking } = useLocationTracking();

  useFocusEffect(
    React.useCallback(() => {
      startTracking();
      return () => stopTracking();
    }, [startTracking, stopTracking]),
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
            message:
              'Sparq needs your location to show you on the map and find matches nearby.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          getUserCurrentLocation();
        } else {
          setHasPermission(false);
          Alert.alert(
            'Permission Denied',
            'Location access is required to see your position. You can enable it in device settings.',
            [{ text: 'OK' }],
          );
        }
      } else {
        Geolocation.requestAuthorization();
        setHasPermission(true);
        getUserCurrentLocation();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const getUserCurrentLocation = () => {
    if (!hasPermission) {
      checkPermissionAndInitialize();
      return;
    }

    // Use currentCoord if Mapbox has already found the user
    if (currentCoord) {
      cameraRef.current?.setCamera({
        centerCoordinate: currentCoord,
        zoomLevel: 17,
        pitch: 45,
        animationDuration: 1500,
      });
      return;
    }

    // Fallback to Geolocation if currentCoord is not yet available
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        const coords: [number, number] = [longitude, latitude];
        setCurrentCoord(coords);
        setUserLocation(coords);

        cameraRef.current?.setCamera({
          centerCoordinate: coords,
          zoomLevel: 17,
          pitch: 45,
          animationDuration: 1500,
        });
      },
      error => {
        console.warn('Location error:', error.message);
        // Try low accuracy if high accuracy fails
        Geolocation.getCurrentPosition(
          pos => {
            const { latitude, longitude } = pos.coords;
            const coords: [number, number] = [longitude, latitude];
            setCurrentCoord(coords);
            cameraRef.current?.setCamera({
              centerCoordinate: coords,
              zoomLevel: 17,
              pitch: 45,
              animationDuration: 1500,
            });
          },
          err => {
             Alert.alert('Location Error', 'Please ensure GPS/Location is enabled in your device settings.');
          },
          { enableHighAccuracy: false, timeout: 10000 }
        );
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 10000 
      },
    );
  };

  const handleCameraChange = (state: any) => {
    const zoom = state.properties.zoom;
    const pitch = state.properties.pitch;

    // Automatic tilt logic for 3D buildings visibility
    // When zooming in past 16.5, if pitch is low, increase it to 60 degrees
    if (zoom > 16.5 && pitch < 20) {
      cameraRef.current?.setCamera({
        pitch: 60,
        animationDuration: 1000,
      });
    } 
    // When zooming out below 15, if pitch is high, reset it to 0
    else if (zoom < 15 && pitch > 40) {
      cameraRef.current?.setCamera({
        pitch: 0,
        animationDuration: 1000,
      });
    }
  };

  const toggleMapStyle = () => {
    setMapStyle(prev => 
      prev === MAP_STYLE_URL 
        ? Mapbox.StyleURL.SatelliteStreet 
        : MAP_STYLE_URL
    );
  };

  const resetToNorth = () => {
    cameraRef.current?.setCamera({
      heading: 0,
      animationDuration: 1000,
    });
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refresh();
      getUserCurrentLocation();

      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    } catch (error) {
      console.error('Refresh error:', error);
      setIsRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={mapStyle}
        logoEnabled={false}
        attributionEnabled={false}
        onPress={() => setSelectedUser(null)}
        onCameraChanged={handleCameraChange}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: DELHI_COORDS,
            zoomLevel: 10,
            pitch: 0,
          }}
        />

        {/* 3D Terrain and Atmosphere */}
        <Mapbox.RasterDemSource
          id="mapbox-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
        />
        <Mapbox.Terrain sourceID="mapbox-dem" exaggeration={1.5} />
        <Mapbox.Atmosphere style={{}} />


        {/* User Location */}
        {hasPermission && (
          <Mapbox.UserLocation
            visible={true}
            animated={true}
            showsUserHeadingIndicator={true}
            androidRenderMode="gps"
            onUpdate={(location) => {
              if (location.coords) {
                setCurrentCoord([location.coords.longitude, location.coords.latitude]);
              }
            }}
          />
        )}

        {/* Matched Users Markers */}
        {matchedLocations.map(user => (
          <Mapbox.MarkerView
            key={user.user_id}
            id={user.user_id}
            coordinate={[user.longitude, user.latitude]}
          >
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setSelectedUser(user)}
            >
              <AvatarMarker
                avatarUrl={user.profile.avatar_url}
                name={user.profile.full_name}
                isOnline={user.isOnline}
                size={44}
              />
            </TouchableOpacity>
          </Mapbox.MarkerView>
        ))}
      </Mapbox.MapView>

      {/* Custom Callout / User Details Card */}
      {selectedUser && (
        <Animated.View 
          style={[
            styles.floatingCallout, 
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }
          ]}
        >
          <View style={styles.calloutHeader}>
            <View style={styles.profileRow}>
              <RNImage 
                source={{ uri: selectedUser.profile.avatar_url || 'https://i.pravatar.cc/150' }}
                style={styles.detailAvatar}
              />
              <View>
                <Text style={[styles.calloutTitle, { color: theme.colors.text }]}>
                  {selectedUser.profile.full_name}
                </Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: selectedUser.isOnline ? '#22C55E' : '#94A3B8' },
                    ]}
                  />
                  <Text style={[styles.calloutSub, { color: theme.colors.textSecondary }]}>
                    {selectedUser.isOnline ? 'Online now' : 'Seen recently'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => setSelectedUser(null)}>
              <Icon name="close-circle" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Control Buttons Stack */}
      <View style={styles.buttonStack}>
        {/* Reset North Button */}
        <TouchableOpacity
          style={[
            styles.stackButton,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={resetToNorth}
        >
          <Icon name="compass-outline" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* Satellite Toggle Button */}
        <TouchableOpacity
          style={[
            styles.stackButton,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={toggleMapStyle}
        >
          <Icon 
            name={mapStyle === MAP_STYLE_URL ? "earth" : "map"} 
            size={24} 
            color={theme.colors.primary} 
          />
        </TouchableOpacity>

        {/* Recenter / My Location Button */}
        <TouchableOpacity
          style={[
            styles.stackButton,
            { backgroundColor: theme.colors.surface },
          ]}
          onPress={getUserCurrentLocation}
        >
          <Icon name="locate" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Overlay Header */}
      <View
        style={[
          styles.overlayHeader,
          { backgroundColor: theme.colors.surface + 'D9' },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={{ width: 30 }} />
          <Text style={[styles.overlayTitle, { color: theme.colors.text }]}>
            Discover Nearby (3D)
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            <Animated.View
              style={isRefreshing ? { transform: [{ rotate: '0deg' }] } : {}}
            >
              <Icon
                name={isRefreshing ? 'sync' : 'refresh'}
                size={22}
                color={theme.colors.primary}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#fff',
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
  buttonStack: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    gap: 12,
  },
  stackButton: {
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
    textAlign: 'center',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCallout: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 15,
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
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
});

export default MapScreen;
