package com.aitravelplatform.modules;

// React Native Bridge - v0.71.x
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter;
import com.facebook.react.module.annotations.ReactModule;

// Google Play Services Location - v21.0.1
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.Priority;

// Android Core Location - SDK 21+
import android.location.Location;
import android.content.Context;
import android.content.pm.PackageManager;
import android.Manifest;
import androidx.core.content.ContextCompat;

/**
 * Native Android module providing location services for the AI Travel Platform.
 * Implements battery-efficient location tracking with configurable update intervals.
 */
@ReactModule(name = LocationModule.MODULE_NAME)
public class LocationModule extends ReactContextBaseJavaModule {

    // Module constants
    private static final String MODULE_NAME = "LocationModule";
    private static final long LOCATION_UPDATE_INTERVAL = 10000L; // 10 seconds
    private static final long LOCATION_FASTEST_INTERVAL = 5000L; // 5 seconds
    private static final float LOCATION_DISPLACEMENT = 10.0f; // 10 meters
    private static final String LOCATION_UPDATE_EVENT = "onLocationUpdate";

    // Module state
    private final ReactApplicationContext reactContext;
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private LocationRequest locationRequest;
    private boolean isLocationUpdatesActive = false;

    public LocationModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.fusedLocationClient = LocationServices.getFusedLocationProviderClient(reactContext);
        setupLocationRequest();
        setupLocationCallback();
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Configures the location request with optimal settings for battery efficiency
     */
    private void setupLocationRequest() {
        locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY)
                .setIntervalMillis(LOCATION_UPDATE_INTERVAL)
                .setMinUpdateIntervalMillis(LOCATION_FASTEST_INTERVAL)
                .setMinUpdateDistanceMeters(LOCATION_DISPLACEMENT)
                .build();
    }

    /**
     * Sets up the callback for handling location updates
     */
    private void setupLocationCallback() {
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                
                for (Location location : locationResult.getLocations()) {
                    sendLocationUpdate(location);
                }
            }
        };
    }

    /**
     * Gets the current device location with high accuracy
     */
    @ReactMethod
    public void getCurrentLocation(final Promise promise) {
        if (!hasLocationPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted");
            return;
        }

        try {
            fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                    .addOnSuccessListener(location -> {
                        if (location != null) {
                            WritableMap locationMap = locationToMap(location);
                            promise.resolve(locationMap);
                        } else {
                            promise.reject("LOCATION_UNAVAILABLE", "Could not get current location");
                        }
                    })
                    .addOnFailureListener(e -> {
                        promise.reject("LOCATION_ERROR", "Error getting location: " + e.getMessage());
                    });
        } catch (SecurityException e) {
            promise.reject("SECURITY_EXCEPTION", "Location permission error: " + e.getMessage());
        }
    }

    /**
     * Starts continuous location updates with battery-efficient settings
     */
    @ReactMethod
    public void startLocationUpdates(final Promise promise) {
        if (isLocationUpdatesActive) {
            promise.resolve("Location updates already active");
            return;
        }

        if (!hasLocationPermission()) {
            promise.reject("PERMISSION_DENIED", "Location permission not granted");
            return;
        }

        try {
            fusedLocationClient.requestLocationUpdates(
                    locationRequest,
                    locationCallback,
                    reactContext.getMainLooper()
            ).addOnSuccessListener(unused -> {
                isLocationUpdatesActive = true;
                promise.resolve("Location updates started");
            }).addOnFailureListener(e -> {
                promise.reject("UPDATE_ERROR", "Failed to start location updates: " + e.getMessage());
            });
        } catch (SecurityException e) {
            promise.reject("SECURITY_EXCEPTION", "Location permission error: " + e.getMessage());
        }
    }

    /**
     * Stops continuous location updates and cleans up resources
     */
    @ReactMethod
    public void stopLocationUpdates(final Promise promise) {
        if (!isLocationUpdatesActive) {
            promise.resolve("Location updates already inactive");
            return;
        }

        try {
            fusedLocationClient.removeLocationUpdates(locationCallback)
                    .addOnSuccessListener(unused -> {
                        isLocationUpdatesActive = false;
                        promise.resolve("Location updates stopped");
                    })
                    .addOnFailureListener(e -> {
                        promise.reject("STOP_ERROR", "Failed to stop location updates: " + e.getMessage());
                    });
        } catch (Exception e) {
            promise.reject("EXCEPTION", "Error stopping location updates: " + e.getMessage());
        }
    }

    /**
     * Checks if location permission is granted
     */
    @ReactMethod
    public void checkLocationPermission(final Promise promise) {
        promise.resolve(hasLocationPermission());
    }

    /**
     * Converts Location object to WritableMap for React Native
     */
    private WritableMap locationToMap(Location location) {
        WritableMap locationMap = Arguments.createMap();
        locationMap.putDouble("latitude", location.getLatitude());
        locationMap.putDouble("longitude", location.getLongitude());
        locationMap.putDouble("altitude", location.getAltitude());
        locationMap.putDouble("accuracy", location.getAccuracy());
        locationMap.putDouble("timestamp", location.getTime());
        
        if (location.hasSpeed()) {
            locationMap.putDouble("speed", location.getSpeed());
        }
        if (location.hasBearing()) {
            locationMap.putDouble("bearing", location.getBearing());
        }
        
        return locationMap;
    }

    /**
     * Sends location update event to JavaScript
     */
    private void sendLocationUpdate(Location location) {
        try {
            WritableMap locationMap = locationToMap(location);
            reactContext
                .getJSModule(RCTDeviceEventEmitter.class)
                .emit(LOCATION_UPDATE_EVENT, locationMap);
        } catch (Exception e) {
            // Log error but don't crash the app
            e.printStackTrace();
        }
    }

    /**
     * Checks if the app has location permission
     */
    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(
                reactContext,
                Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;
    }
}