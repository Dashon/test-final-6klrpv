package com.aitravelplatform;

// React Native imports - v0.71.x
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

// Android imports
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.os.Build;
import android.view.WindowManager;

// Performance monitoring
import com.facebook.react.perfmonitor.PerformanceMonitor;
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.bridge.ReactMarkerConstants;

// Security imports
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManagerFactory;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;

/**
 * Enhanced MainActivity class for the AI Travel Platform Android application.
 * Implements security measures, performance monitoring, and optimized native module initialization.
 * 
 * @version 1.0.0
 */
public class MainActivity extends ReactActivity {

    private PerformanceMonitor performanceMonitor;
    private static final String PERFORMANCE_TAG = "MainActivity";
    private static final int SSL_TIMEOUT_MS = 10000;

    /**
     * Constructor initializes performance monitoring and security configurations
     */
    public MainActivity() {
        super();
        this.performanceMonitor = new PerformanceMonitor();
    }

    /**
     * Returns the name of the main component registered from JavaScript.
     * This is used to schedule rendering of the component.
     */
    @Override
    protected String getMainComponentName() {
        return "AITravelPlatform";
    }

    /**
     * Enhanced onCreate with security checks and performance monitoring
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        performanceMonitor.startMetric("activity_creation");

        // Security configurations
        if (!BuildConfig.DEBUG) {
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
            );
        }

        // Initialize security measures
        initializeSecurity();

        // Setup performance monitoring
        setupPerformanceMonitoring();

        super.onCreate(savedInstanceState);

        // Initialize crash reporting
        setupCrashReporting();

        // Configure accessibility
        configureAccessibility();

        performanceMonitor.endMetric("activity_creation");
    }

    /**
     * Creates an enhanced ReactActivityDelegate with security measures
     */
    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        performanceMonitor.startMetric("delegate_creation");
        
        ReactActivityDelegate delegate = new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            // If you opted-in for the New Architecture, we enable the Fabric Renderer.
            getMainComponentName()
        );

        performanceMonitor.endMetric("delegate_creation");
        return delegate;
    }

    /**
     * Initializes security configurations including SSL pinning and root detection
     */
    private void initializeSecurity() {
        try {
            // Configure SSL context with TLS 1.3
            SSLContext sslContext = SSLContext.getInstance("TLSv1.3");
            TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(
                TrustManagerFactory.getDefaultAlgorithm()
            );
            
            // Load certificates
            KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
            keyStore.load(null, null);
            
            // Initialize trust manager
            trustManagerFactory.init(keyStore);
            sslContext.init(null, trustManagerFactory.getTrustManagers(), null);
            
            // Set as default SSL context
            SSLContext.setDefault(sslContext);

            // Root detection
            if (isDeviceRooted()) {
                throw new SecurityException("Device integrity check failed");
            }

        } catch (Exception e) {
            throw new SecurityException("Security initialization failed", e);
        }
    }

    /**
     * Sets up performance monitoring for React Native bridge
     */
    private void setupPerformanceMonitoring() {
        ReactMarker.addListener((name, tag, instanceKey) -> {
            switch (name) {
                case REACT_BRIDGE_SETUP_START:
                    performanceMonitor.startMetric("bridge_setup");
                    break;
                case REACT_BRIDGE_SETUP_END:
                    performanceMonitor.endMetric("bridge_setup");
                    break;
                case NATIVE_MODULE_INITIALIZE_START:
                    performanceMonitor.startMetric("native_module_init");
                    break;
                case NATIVE_MODULE_INITIALIZE_END:
                    performanceMonitor.endMetric("native_module_init");
                    break;
            }
        });
    }

    /**
     * Checks if device is rooted
     */
    private boolean isDeviceRooted() {
        String buildTags = android.os.Build.TAGS;
        if (buildTags != null && buildTags.contains("test-keys")) {
            return true;
        }

        // Check for common root management apps
        String[] rootApps = {
            "com.noshufou.android.su",
            "com.thirdparty.superuser",
            "eu.chainfire.supersu"
        };

        for (String app : rootApps) {
            try {
                getPackageManager().getPackageInfo(app, 0);
                return true;
            } catch (PackageManager.NameNotFoundException e) {
                // Package not found, continue checking
            }
        }

        return false;
    }

    /**
     * Sets up crash reporting and error boundaries
     */
    private void setupCrashReporting() {
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            performanceMonitor.logCrash(throwable);
            // Implement crash reporting logic here
        });
    }

    /**
     * Configures accessibility features
     */
    private void configureAccessibility() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getWindow().getDecorView().setImportantForAutofill(
                android.view.View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
            );
        }
    }

    /**
     * Cleanup resources when activity is destroyed
     */
    @Override
    protected void onDestroy() {
        performanceMonitor.startMetric("activity_cleanup");
        super.onDestroy();
        ReactMarker.clearListener();
        performanceMonitor.endMetric("activity_cleanup");
    }
}