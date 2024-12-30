package com.aitravelplatform;

// JUnit imports - v4.13.2
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import static org.junit.Assert.*;

// Android test imports
import androidx.test.rule.ActivityTestRule;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.filters.LargeTest;

// React Native imports - v0.71.x
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler;
import com.facebook.react.ReactRootView;

// Performance monitoring imports - v1.0.0
import com.aitravelplatform.performance.PerformanceMonitor;
import com.aitravelplatform.performance.metrics.ActivityMetrics;
import com.aitravelplatform.performance.metrics.MemoryMetrics;

// Security validation imports - v1.0.0
import com.aitravelplatform.security.SecurityUtils;
import com.aitravelplatform.security.CertificateValidator;
import com.aitravelplatform.security.RootDetector;

// Android imports
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;

/**
 * Comprehensive instrumentation test class for MainActivity
 * Tests security configurations, performance metrics, and React Native integration
 * 
 * @version 1.0.0
 */
@LargeTest
public class MainActivityTest {

    private static final long BRIDGE_TIMEOUT_MS = 10000;
    private static final long UI_TIMEOUT_MS = 5000;
    private static final int MIN_MEMORY_MB = 50;
    private static final int MAX_STARTUP_TIME_MS = 3000;

    @Rule
    public ActivityTestRule<MainActivity> activityRule = 
        new ActivityTestRule<>(MainActivity.class, false, false);

    private PerformanceMonitor perfMonitor;
    private SecurityUtils securityUtils;
    private Context context;
    private MainActivity activity;

    /**
     * Setup test environment with enhanced security and performance monitoring
     */
    @Before
    public void setUp() throws Exception {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        perfMonitor = new PerformanceMonitor();
        securityUtils = new SecurityUtils(context);

        // Start performance monitoring
        perfMonitor.startMetric("test_setup");

        // Initialize security validation
        assertTrue("Security initialization failed", securityUtils.initialize());
        
        // Launch activity
        activity = activityRule.launchActivity(null);
        assertNotNull("Activity launch failed", activity);

        // Wait for React Native bridge
        waitForBridgeAndUI();

        perfMonitor.endMetric("test_setup");
    }

    /**
     * Tests security configurations and validations
     */
    @Test
    public void testSecurityConfiguration() {
        perfMonitor.startMetric("security_test");

        // Verify SSL pinning
        assertTrue("SSL pinning not configured", 
            securityUtils.verifySslPinning());

        // Check root detection
        assertFalse("Root detection failed", 
            activity.isDeviceRooted());

        // Validate secure window flags
        int flags = activity.getWindow().getAttributes().flags;
        assertTrue("Secure window flag not set", 
            (flags & WindowManager.LayoutParams.FLAG_SECURE) != 0);

        // Verify certificate validation
        assertTrue("Certificate validation failed",
            securityUtils.validateCertificates());

        // Check security headers
        assertTrue("Security headers missing",
            securityUtils.verifySecurityHeaders());

        perfMonitor.endMetric("security_test");
    }

    /**
     * Tests performance metrics and thresholds
     */
    @Test
    public void testPerformanceMetrics() {
        perfMonitor.startMetric("performance_test");

        // Measure startup time
        long startupTime = perfMonitor.getMetric("activity_creation");
        assertTrue("Startup time exceeded threshold", 
            startupTime < MAX_STARTUP_TIME_MS);

        // Check memory usage
        MemoryMetrics memoryMetrics = perfMonitor.getMemoryMetrics();
        assertTrue("Insufficient memory available",
            memoryMetrics.getAvailableMemoryMB() > MIN_MEMORY_MB);

        // Verify UI rendering performance
        ActivityMetrics activityMetrics = perfMonitor.getActivityMetrics();
        assertTrue("UI thread blocked",
            activityMetrics.getFrameDropRate() < 0.1); // Max 10% dropped frames

        // Test React Native bridge performance
        long bridgeInitTime = perfMonitor.getMetric("bridge_setup");
        assertTrue("Bridge initialization too slow",
            bridgeInitTime < BRIDGE_TIMEOUT_MS);

        perfMonitor.endMetric("performance_test");
    }

    /**
     * Tests React Native bridge initialization and functionality
     */
    @Test
    public void testReactBridgeInitialization() {
        perfMonitor.startMetric("bridge_test");

        ReactInstanceManager instanceManager = activity.getReactInstanceManager();
        assertNotNull("React instance manager is null", instanceManager);

        ReactContext reactContext = instanceManager.getCurrentReactContext();
        assertNotNull("React context is null", reactContext);

        // Verify root view attachment
        ReactRootView rootView = activity.findViewById(android.R.id.content)
            .findViewWithTag("react_root_view");
        assertNotNull("React root view not found", rootView);

        // Test JavaScript module initialization
        assertTrue("JS modules not initialized",
            reactContext.hasActiveReactInstance());

        // Verify native module registration
        assertTrue("Native modules not registered",
            reactContext.getCatalystInstance().isDestroyed());

        perfMonitor.endMetric("bridge_test");
    }

    /**
     * Waits for React Native bridge initialization and UI rendering
     */
    private void waitForBridgeAndUI() throws InterruptedException {
        ReactInstanceManager instanceManager = activity.getReactInstanceManager();
        long startTime = System.currentTimeMillis();

        while (instanceManager.getCurrentReactContext() == null) {
            Thread.sleep(100);
            if (System.currentTimeMillis() - startTime > BRIDGE_TIMEOUT_MS) {
                throw new RuntimeException("Bridge initialization timeout");
            }
        }

        // Wait for UI to be ready
        View contentView = activity.findViewById(android.R.id.content);
        contentView.post(() -> {
            synchronized (MainActivityTest.this) {
                MainActivityTest.this.notify();
            }
        });

        synchronized (this) {
            wait(UI_TIMEOUT_MS);
        }
    }
}