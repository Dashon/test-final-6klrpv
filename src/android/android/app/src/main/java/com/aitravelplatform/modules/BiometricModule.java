/**
 * BiometricModule.java
 * Version: 1.0.0
 * 
 * A secure biometric authentication module for React Native that implements
 * Android's BiometricPrompt API with comprehensive security validations,
 * error handling, and proper resource management.
 */

package com.aitravelplatform.modules;

// React Native Bridge - Version 0.71.x
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

// AndroidX Biometric - Version 1.2.0-alpha05
import androidx.biometric.BiometricPrompt;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricManager.Authenticators;

// Fragment Activity - Version 1.5.x
import androidx.fragment.app.FragmentActivity;

// Android Core
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

// Java Utils
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class BiometricModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "BiometricModule";
    private static final int AUTHENTICATION_TIMEOUT_MS = 30000; // 30 seconds
    
    private final ReactApplicationContext reactContext;
    private final BiometricManager biometricManager;
    private final Executor executor;
    private BiometricPrompt biometricPrompt;
    private final AtomicBoolean isAuthenticating;
    
    private static final int BIOMETRIC_STRONG = Authenticators.BIOMETRIC_STRONG;
    private static final int SECURITY_PATCH_THRESHOLD = 202301; // January 2023

    public BiometricModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.executor = Executors.newSingleThreadExecutor();
        this.biometricManager = BiometricManager.from(reactContext);
        this.isAuthenticating = new AtomicBoolean(false);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Checks if biometric authentication is available with proper security validations
     * @param promise Promise to resolve with availability status
     */
    @ReactMethod
    public void isBiometricAvailable(final Promise promise) {
        try {
            int result = biometricManager.canAuthenticate(BIOMETRIC_STRONG);
            WritableMap resultMap = Arguments.createMap();
            
            // Verify system security patch level
            String[] patchLevel = Build.VERSION.SECURITY_PATCH.split("-");
            int currentPatchLevel = Integer.parseInt(patchLevel[0].replace("-", ""));
            
            if (currentPatchLevel < SECURITY_PATCH_THRESHOLD) {
                resultMap.putBoolean("available", false);
                resultMap.putString("error", "SECURITY_PATCH_TOO_OLD");
                promise.resolve(resultMap);
                return;
            }

            switch (result) {
                case BiometricManager.BIOMETRIC_SUCCESS:
                    resultMap.putBoolean("available", true);
                    resultMap.putString("status", "AVAILABLE");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                    resultMap.putBoolean("available", false);
                    resultMap.putString("error", "NO_HARDWARE");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                    resultMap.putBoolean("available", false);
                    resultMap.putString("error", "HARDWARE_UNAVAILABLE");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                    resultMap.putBoolean("available", false);
                    resultMap.putString("error", "NOT_ENROLLED");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                    resultMap.putBoolean("available", false);
                    resultMap.putString("error", "SECURITY_UPDATE_REQUIRED");
                    break;
                default:
                    resultMap.putBoolean("available", false);
                    resultMap.putString("error", "UNKNOWN_ERROR");
            }
            
            promise.resolve(resultMap);
        } catch (Exception e) {
            promise.reject("BIOMETRIC_ERROR", "Failed to check biometric availability: " + e.getMessage());
        }
    }

    /**
     * Initiates secure biometric authentication
     * @param title Dialog title
     * @param subtitle Dialog subtitle
     * @param promise Promise to resolve with authentication result
     */
    @ReactMethod
    public void authenticate(String title, String subtitle, final Promise promise) {
        if (isAuthenticating.get()) {
            promise.reject("BIOMETRIC_ERROR", "Authentication already in progress");
            return;
        }

        if (title == null || title.isEmpty() || subtitle == null || subtitle.isEmpty()) {
            promise.reject("INVALID_PARAMS", "Title and subtitle are required");
            return;
        }

        FragmentActivity activity = (FragmentActivity) getCurrentActivity();
        if (activity == null) {
            promise.reject("ACTIVITY_ERROR", "Activity is not available");
            return;
        }

        try {
            isAuthenticating.set(true);

            BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(title)
                .setSubtitle(subtitle)
                .setAllowedAuthenticators(BIOMETRIC_STRONG)
                .setNegativeButtonText("Cancel")
                .setConfirmationRequired(true)
                .build();

            BiometricPrompt.AuthenticationCallback callback = new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    isAuthenticating.set(false);
                    WritableMap resultMap = Arguments.createMap();
                    resultMap.putBoolean("success", true);
                    promise.resolve(resultMap);
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errString) {
                    isAuthenticating.set(false);
                    WritableMap resultMap = Arguments.createMap();
                    resultMap.putBoolean("success", false);
                    resultMap.putInt("errorCode", errorCode);
                    resultMap.putString("error", errString.toString());
                    promise.resolve(resultMap);
                }

                @Override
                public void onAuthenticationFailed() {
                    // Don't resolve promise here, let the user retry
                    WritableMap resultMap = Arguments.createMap();
                    resultMap.putBoolean("success", false);
                    resultMap.putString("error", "AUTHENTICATION_FAILED");
                }
            };

            activity.runOnUiThread(() -> {
                biometricPrompt = new BiometricPrompt(activity, executor, callback);
                biometricPrompt.authenticate(promptInfo);

                // Set authentication timeout
                executor.execute(() -> {
                    try {
                        Thread.sleep(AUTHENTICATION_TIMEOUT_MS);
                        if (isAuthenticating.get()) {
                            biometricPrompt.cancelAuthentication();
                            isAuthenticating.set(false);
                            WritableMap resultMap = Arguments.createMap();
                            resultMap.putBoolean("success", false);
                            resultMap.putString("error", "TIMEOUT");
                            promise.resolve(resultMap);
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                });
            });

        } catch (Exception e) {
            isAuthenticating.set(false);
            promise.reject("BIOMETRIC_ERROR", "Failed to initialize biometric prompt: " + e.getMessage());
        }
    }

    /**
     * Cleanup resources when module is destroyed
     */
    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (biometricPrompt != null && isAuthenticating.get()) {
            biometricPrompt.cancelAuthentication();
        }
        isAuthenticating.set(false);
        if (executor instanceof java.util.concurrent.ExecutorService) {
            ((java.util.concurrent.ExecutorService) executor).shutdown();
            try {
                if (!((java.util.concurrent.ExecutorService) executor).awaitTermination(800, TimeUnit.MILLISECONDS)) {
                    ((java.util.concurrent.ExecutorService) executor).shutdownNow();
                }
            } catch (InterruptedException e) {
                ((java.util.concurrent.ExecutorService) executor).shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }
}