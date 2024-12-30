package com.aitravelplatform;

// Detox imports - v18.x
import com.wix.detox.Detox;
import com.wix.detox.config.DetoxConfig;

// JUnit imports - v4.13.2
import org.junit.Rule;
import org.junit.Test;
import org.junit.Before;
import org.junit.runner.RunWith;

// Android test imports - v1.4.0
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.rule.ActivityTestRule;

// Performance monitoring - v18.x
import com.wix.detox.performance.DetoxTestPerformanceLogger;
import com.wix.detox.performance.TimingModule;

// Native module testing - v18.x
import com.wix.detox.native_testing.NativeModuleRegistry;
import com.wix.detox.native_testing.NativeModuleTestSupport;

// Java utils
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Enhanced Detox test class for end-to-end testing of the AI Travel Platform.
 * Implements comprehensive test setup, performance monitoring, and native module testing.
 * 
 * @version 1.0.0
 */
@RunWith(AndroidJUnit4.class)
@LargeTest
public class DetoxTest {

    private static final long TEST_TIMEOUT_MS = 600000; // 10 minutes
    private static final String PERFORMANCE_TAG = "E2ETests";

    /**
     * Activity test rule for managing the MainActivity lifecycle
     */
    @Rule
    public ActivityTestRule<MainActivity> activityRule = new ActivityTestRule<>(
        MainActivity.class,
        false,
        false
    );

    /**
     * Performance monitoring logger
     */
    private static final DetoxTestPerformanceLogger performanceLogger = new DetoxTestPerformanceLogger(
        PERFORMANCE_TAG,
        TEST_TIMEOUT_MS
    );

    /**
     * Native module test support
     */
    private NativeModuleTestSupport nativeModuleSupport;

    /**
     * Test execution state
     */
    private final AtomicBoolean isTestRunning = new AtomicBoolean(false);

    /**
     * Enhanced setup method that initializes the test environment with performance
     * monitoring and native module support.
     */
    @Before
    public void setUp() {
        try {
            // Start performance monitoring
            performanceLogger.startMetric("test_setup");

            // Configure test timeout
            DetoxConfig.Builder configBuilder = new DetoxConfig.Builder()
                .withTimeout(TEST_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                .withIdlePolicyConfig(true, 500, 10000) // Wait for idle with timeout
                .withTestRunner("junit4");

            // Initialize Detox with enhanced configuration
            Detox.init(configBuilder.build());

            // Setup native module testing support
            nativeModuleSupport = new NativeModuleTestSupport();
            registerNativeModules();

            // Configure test server connection
            setupTestServer();

            // Initialize device synchronization
            initializeDeviceSynchronization();

            performanceLogger.endMetric("test_setup");

        } catch (Exception e) {
            performanceLogger.logError("Setup failed", e);
            throw new RuntimeException("Test setup failed", e);
        }
    }

    /**
     * Main test runner method with enhanced error handling and performance monitoring
     */
    @Test
    public void runDetoxTests() {
        if (isTestRunning.get()) {
            throw new IllegalStateException("Test is already running");
        }

        try {
            isTestRunning.set(true);
            performanceLogger.startMetric("test_execution");

            // Launch main activity with validation
            activityRule.launchActivity(null);
            validateActivityLaunch();

            // Execute Detox tests with monitoring
            Detox.runTests(activityRule);

            performanceLogger.endMetric("test_execution");

        } catch (Exception e) {
            performanceLogger.logError("Test execution failed", e);
            throw new RuntimeException("Test execution failed", e);
        } finally {
            isTestRunning.set(false);
            cleanup();
        }
    }

    /**
     * Registers native modules for testing
     */
    private void registerNativeModules() {
        performanceLogger.startMetric("native_module_registration");

        // Register BiometricModule for testing
        nativeModuleSupport.registerModule(
            "BiometricModule",
            new BiometricModule(activityRule.getActivity())
        );

        // Register LocationModule for testing
        nativeModuleSupport.registerModule(
            "LocationModule",
            new LocationModule(activityRule.getActivity())
        );

        // Register PaymentModule for testing
        nativeModuleSupport.registerModule(
            "PaymentModule",
            new PaymentModule(activityRule.getActivity())
        );

        performanceLogger.endMetric("native_module_registration");
    }

    /**
     * Configures test server connection with retry mechanism
     */
    private void setupTestServer() {
        performanceLogger.startMetric("server_setup");

        try {
            Detox.connectToServer(
                "localhost",
                8099,
                3,  // Max retries
                1000 // Retry interval in ms
            );
        } catch (Exception e) {
            performanceLogger.logError("Server connection failed", e);
            throw new RuntimeException("Failed to connect to test server", e);
        }

        performanceLogger.endMetric("server_setup");
    }

    /**
     * Initializes device synchronization with enhanced waiting strategies
     */
    private void initializeDeviceSynchronization() {
        performanceLogger.startMetric("sync_setup");

        try {
            Detox.initializeSynchronization(
                500,  // Idle timeout in ms
                10000 // Operation timeout in ms
            );
        } catch (Exception e) {
            performanceLogger.logError("Synchronization setup failed", e);
            throw new RuntimeException("Failed to initialize synchronization", e);
        }

        performanceLogger.endMetric("sync_setup");
    }

    /**
     * Validates main activity launch
     */
    private void validateActivityLaunch() {
        if (activityRule.getActivity() == null) {
            throw new RuntimeException("MainActivity failed to launch");
        }

        String componentName = activityRule.getActivity().getMainComponentName();
        if (!"AITravelPlatform".equals(componentName)) {
            throw new RuntimeException("Invalid main component name: " + componentName);
        }
    }

    /**
     * Performs cleanup after test execution
     */
    private void cleanup() {
        performanceLogger.startMetric("cleanup");

        try {
            // Cleanup native module test support
            if (nativeModuleSupport != null) {
                nativeModuleSupport.cleanup();
            }

            // Generate performance report
            performanceLogger.generateReport();

        } catch (Exception e) {
            performanceLogger.logError("Cleanup failed", e);
        } finally {
            performanceLogger.endMetric("cleanup");
        }
    }
}