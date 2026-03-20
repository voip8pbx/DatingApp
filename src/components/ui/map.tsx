// Map component wrapper using @maplibre/maplibre-react-native
// This provides the same API as mapcn-react-native

import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import { View, StyleSheet, useColorScheme, ViewStyle } from 'react-native';
import { Map, Camera, UserLocation, Marker, LocationManager, useCurrentPosition } from '@maplibre/maplibre-react-native';
const MLRN = { Map, Camera, UserLocation, Marker, LocationManager, useCurrentPosition };

// CARTO basemap URLs (free for non-commercial use)
const CARTO_LIGHT_URL = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const CARTO_DARK_URL = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

interface MapComponentProps {
    style?: ViewStyle;
    children?: React.ReactNode;
    [key: string]: any;
}

// Re-export Map component
export const MapComponent = forwardRef<any, MapComponentProps>(
    ({ style, children, ...props }, ref) => {
        const colorScheme = useColorScheme();
        const mapRef = useRef<any>(null);

        useImperativeHandle(ref, () => mapRef.current, []);

        return (
            <View style={[styles.container, style]}>
                <MLRN.Map
                    ref={mapRef}
                    style={styles.map}
                    mapStyle={colorScheme === 'dark' ? CARTO_DARK_URL : CARTO_LIGHT_URL}
                    {...props}
                >
                    {children}
                </MLRN.Map>
            </View>
        );
    }
);

// Explicitly export Map as MapComponent to avoid name conflict with MLRN.Map
export { MapComponent as Map };

// Export Marker component with any props
export const MapMarker = (props: any) => {
    return <MLRN.Marker {...props} />;
};

// Marker content wrapper
export const MarkerContent = View;

// Marker popup wrapper
export const MarkerPopup = ({
    children,
    visible = true,
}: {
    children: React.ReactNode;
    visible?: boolean;
}) => {
    if (!visible) return null;
    return <>{children}</>;
};

// User location component
export const MapUserLocation = (props: any) => {
    return <MLRN.UserLocation {...props} />;
};

// Map controls placeholder
export const MapControls = (props: any) => {
    return null;
};

// Export Camera
export const MapCamera = Camera;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
});

export default Map;
