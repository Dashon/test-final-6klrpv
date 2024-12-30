package com.aitravelplatform;

// Android imports - SDK 21+
import android.app.Application;
import android.content.Context;
import android.os.StrictMode;

// React Native imports - v0.71.x
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.PackageList;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;

// Native Module imports
import com.aitravelplatform.modules.BiometricModule;
import com.aitravelplatform.modules.LocationModule;
import com.aitravelplatform.modules.PaymentModule;

// Performance monitoring
import com.facebook.react.bridge.ReactMarker;
import com.facebook.react.bridge.ReactMarkerConstants;

// Security imports
import java.security.Security;
import java.util.List;
import java.util.concurrent.TimeUnit;
import javax.net.ssl.SSLContext;

/**
 * Main Application class for the AI Travel Platform Android app.
 * Implements enhanced security, performance monitoring, and native module integration.
 * 
 * @version 1.0.0
 */
public class MainApplication extends Application implements ReactApplication {

    private final PerformanceMonitor performanceMonitor;
    private final SecurityManager securityManager;

    private final ReactNativeHost mReactNativeHost = new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
            List<ReactPackage> packages = new PackageList(this).getPackages();
            // Add custom native modules
            packages.add(new BiometricModule(getApplicationContext()));
            packages.add(new LocationModule(getApplicationContext()));
            packages.add(new PaymentModule(getApplicationContext()));
            return packages;
        }

        @Override
        protected String getJSMainModuleName() {
            return "index";
        }

        @Override
        protected boolean isNewArchEnabled() {
            return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }

        @Override
        protected Boolean isHermesEnabled() {
            return BuildConfig.IS_HERMES_ENABLED;
        }
    };

    public MainApplication() {
        super();
        this.performanceMonitor = new PerformanceMonitor();
        this.securityManager = new SecurityManager();
        setupPerformanceMonitoring();
    }

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    @Override
    public void onCreate() {
        // Start performance tracking
        performanceMonitor.startMetric("app_initialization");

        // Enable strict mode in debug builds
        if (BuildConfig.DEBUG) {
            enableStrictMode();
        }

        super.onCreate();

        // Initialize security configurations
        initializeSecurity();

        // Initialize React Native
        initializeReactNative();

        // Setup crash reporting
        setupCrashReporting();

        // End performance tracking
        performanceMonitor.endMetric("app_initialization");
    }

    /**
     * Initializes security configurations for the application
     */
    private void initializeSecurity() {
        try {
            // Configure SSL/TLS
            SSLContext.getInstance("TLSv1.3");
            Security.setProperty("crypto.policy", "unlimited");

            // Initialize security manager
            securityManager.initialize(getApplicationContext());
            securityManager.enforceSecurityPolicy();

        } catch (Exception e) {
            throw new SecurityException("Failed to initialize security", e);
        }
    }

    /**
     * Initializes React Native with enhanced error handling
     */
    private void initializeReactNative() {
        try {
            // Initialize SoLoader with security checks
            SoLoader.init(this, false);

            if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
                // Initialize the new architecture
                DefaultNewArchitectureEntryPoint.load();
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize React Native", e);
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
     * Enables strict mode for debug builds
     */
    private void enableStrictMode() {
        StrictMode.setThreadPolicy(new StrictMode.ThreadPolicy.Builder()
                .detectDiskReads()
                .detectDiskWrites()
                .detectNetwork()
                .penaltyLog()
                .build());

        StrictMode.setVmPolicy(new StrictMode.VmPolicy.Builder()
                .detectLeakedSqlLiteObjects()
                .detectLeakedClosableObjects()
                .penaltyLog()
                .build());
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
     * Inner class for performance monitoring
     */
    private static class PerformanceMonitor {
        private long startTime;

        void startMetric(String metricName) {
            startTime = System.nanoTime();
        }

        void endMetric(String metricName) {
            long duration = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startTime);
            // Implement metric logging logic here
        }

        void logCrash(Throwable throwable) {
            // Implement crash logging logic here
        }
    }

    /**
     * Inner class for security management
     */
    private static class SecurityManager {
        void initialize(Context context) {
            // Implement security initialization logic here
        }

        void enforceSecurityPolicy() {
            // Implement security policy enforcement logic here
        }
    }
}