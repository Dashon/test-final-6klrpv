// @ts-check
// Detox E2E Testing Framework v18.x
// Jest Testing Framework v29.5.x

const { device, element, by, expect } = require('detox');
const { DETOX_CONFIG } = require('./config.json');

// Performance monitoring utilities
const performanceMetrics = {
  startTime: null,
  measurements: {},
  start(label) {
    this.measurements[label] = { start: Date.now() };
  },
  end(label) {
    if (this.measurements[label]) {
      this.measurements[label].end = Date.now();
      this.measurements[label].duration = 
        this.measurements[label].end - this.measurements[label].start;
    }
  }
};

describe('AI Travel Platform E2E Tests', () => {
  beforeAll(async () => {
    performanceMetrics.startTime = Date.now();
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', location: 'always' }
    });
    await device.setURLBlacklist(['.*google-analytics.*']);
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    performanceMetrics.start('testCase');
  });

  afterEach(async () => {
    performanceMetrics.end('testCase');
  });

  afterAll(async () => {
    const totalDuration = Date.now() - performanceMetrics.startTime;
    console.log('Total test duration:', totalDuration, 'ms');
    console.log('Performance metrics:', performanceMetrics.measurements);
  });

  describe('AuthenticationFlow', () => {
    describe('Login Screen', () => {
      it('should display all login screen elements correctly', async () => {
        await expect(element(by.id('login-screen'))).toBeVisible();
        await expect(element(by.id('email-input'))).toBeVisible();
        await expect(element(by.id('password-input'))).toBeVisible();
        await expect(element(by.id('login-button'))).toBeVisible();
      });

      it('should validate email format', async () => {
        const emailInput = element(by.id('email-input'));
        await emailInput.typeText('invalid-email');
        await element(by.id('login-button')).tap();
        await expect(element(by.id('email-error'))).toBeVisible();
        await expect(element(by.id('email-error'))).toHaveText('Invalid email format');
      });

      it('should validate password requirements', async () => {
        const passwordInput = element(by.id('password-input'));
        await passwordInput.typeText('weak');
        await element(by.id('login-button')).tap();
        await expect(element(by.id('password-error'))).toBeVisible();
        await expect(element(by.id('password-error')))
          .toHaveText('Password must be at least 8 characters');
      });

      it('should handle successful login', async () => {
        performanceMetrics.start('login');
        await element(by.id('email-input')).typeText('test@example.com');
        await element(by.id('password-input')).typeText('StrongPass123!');
        await element(by.id('login-button')).tap();
        await expect(element(by.id('dashboard-screen'))).toBeVisible();
        performanceMetrics.end('login');
      });

      it('should handle biometric authentication', async () => {
        await element(by.id('biometric-login')).tap();
        // Simulate biometric success
        await device.setBiometricEnrollment(true);
        await device.matchFace();
        await expect(element(by.id('dashboard-screen'))).toBeVisible();
      });
    });
  });

  describe('DashboardFlow', () => {
    beforeEach(async () => {
      // Ensure we're logged in before dashboard tests
      await device.executeScript('login', { user: 'test@example.com' });
    });

    describe('Dashboard Screen', () => {
      it('should display active AI personas', async () => {
        await expect(element(by.id('persona-carousel'))).toBeVisible();
        await expect(element(by.id('add-persona-button'))).toBeVisible();
        
        // Verify persona interaction
        await element(by.id('persona-card-0')).tap();
        await expect(element(by.id('persona-detail-screen'))).toBeVisible();
      });

      it('should handle real-time chat functionality', async () => {
        performanceMetrics.start('chatResponse');
        await element(by.id('chat-input')).typeText('Plan a trip to Paris');
        await element(by.id('send-button')).tap();
        
        // Wait for AI response with timeout
        await waitFor(element(by.id('ai-response')))
          .toBeVisible()
          .withTimeout(5000);
        
        performanceMetrics.end('chatResponse');
        
        // Verify response content
        await expect(element(by.id('ai-response')))
          .toHaveText(expect.stringContaining('Paris'));
      });

      it('should handle booking flow', async () => {
        await element(by.id('new-booking-button')).tap();
        await expect(element(by.id('booking-form'))).toBeVisible();
        
        // Fill booking details
        await element(by.id('destination-input')).typeText('Paris');
        await element(by.id('date-picker')).tap();
        await element(by.text('15')).tap();
        await element(by.id('confirm-date-button')).tap();
        
        // Verify booking summary
        await element(by.id('confirm-booking-button')).tap();
        await expect(element(by.id('booking-confirmation')))
          .toBeVisible();
      });

      it('should handle offline functionality', async () => {
        // Simulate offline mode
        await device.setNetworkConditions({ offline: true });
        
        // Verify offline indicator
        await expect(element(by.id('offline-indicator'))).toBeVisible();
        
        // Verify cached content is accessible
        await expect(element(by.id('recent-bookings'))).toBeVisible();
        
        // Restore network
        await device.setNetworkConditions({ offline: false });
      });
    });
  });

  describe('Performance Tests', () => {
    it('should load dashboard within performance budget', async () => {
      performanceMetrics.start('dashboardLoad');
      await device.reloadReactNative();
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(2000);
      performanceMetrics.end('dashboardLoad');
      
      const loadTime = performanceMetrics.measurements.dashboardLoad.duration;
      expect(loadTime).toBeLessThan(2000); // 2 second budget
    });

    it('should handle rapid screen transitions', async () => {
      const screens = ['profile', 'bookings', 'chat', 'settings'];
      
      for (const screen of screens) {
        performanceMetrics.start(`transition-${screen}`);
        await element(by.id(`${screen}-tab`)).tap();
        await expect(element(by.id(`${screen}-screen`))).toBeVisible();
        performanceMetrics.end(`transition-${screen}`);
        
        const transitionTime = performanceMetrics.measurements[`transition-${screen}`].duration;
        expect(transitionTime).toBeLessThan(500); // 500ms budget
      }
    });
  });
});

// Helper function for conditional waiting
async function waitFor(element) {
  return {
    toBeVisible: async () => {
      return {
        withTimeout: async (timeout) => {
          const startTime = Date.now();
          while (Date.now() - startTime < timeout) {
            try {
              await expect(element).toBeVisible();
              return;
            } catch (e) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          throw new Error(`Timeout waiting for element after ${timeout}ms`);
        }
      };
    }
  };
}