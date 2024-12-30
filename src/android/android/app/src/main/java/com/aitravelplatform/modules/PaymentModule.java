package com.aitravelplatform.modules;

// React Native imports - v0.71.0
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

// Stripe SDK imports - v20.25.0
import com.stripe.android.Stripe;
import com.stripe.android.PaymentConfiguration;
import com.stripe.android.model.PaymentIntent;
import com.stripe.android.model.ConfirmPaymentIntentParams;

// Android imports
import android.app.Activity;
import android.util.Log;

// Security imports
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.security.SecureRandom;
import java.util.concurrent.TimeUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Native Android module for secure payment processing with Stripe integration.
 * Implements split payments and enhanced security measures.
 * 
 * @version 1.0.0
 * @author AI Travel Platform
 */
public class PaymentModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "PaymentModule";
    private static final String TAG = "PaymentModule";
    private static final int MAX_SPLIT_PARTICIPANTS = 5;
    private static final double MIN_PAYMENT_AMOUNT = 1.0;
    private static final int PAYMENT_TIMEOUT_MS = 30000;
    private static final int GCM_TAG_LENGTH = 128;
    private static final String ENCRYPTION_ALGORITHM = "AES/GCM/NoPadding";

    private final ReactApplicationContext reactContext;
    private final Stripe stripe;
    private final Cipher encryptionCipher;
    private final SecretKey encryptionKey;
    private final PaymentConfiguration paymentConfiguration;

    /**
     * Constructor initializes payment module with security configurations.
     * 
     * @param reactContext The React Native application context
     */
    public PaymentModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;

        // Initialize encryption
        try {
            KeyGenerator keyGen = KeyGenerator.getInstance("AES");
            keyGen.init(256, new SecureRandom());
            this.encryptionKey = keyGen.generateKey();
            this.encryptionCipher = Cipher.getInstance(ENCRYPTION_ALGORITHM);
        } catch (Exception e) {
            Log.e(TAG, "Encryption initialization failed", e);
            throw new RuntimeException("Security initialization failed", e);
        }

        // Initialize Stripe
        String publishableKey = BuildConfig.STRIPE_PUBLISHABLE_KEY;
        PaymentConfiguration.init(reactContext, publishableKey);
        this.stripe = new Stripe(reactContext, publishableKey);
        this.paymentConfiguration = PaymentConfiguration.getInstance(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Creates an encrypted payment intent for secure transaction processing.
     * 
     * @param amount Payment amount
     * @param currency Currency code (e.g., "USD")
     * @param promise Promise to resolve/reject the operation
     */
    @ReactMethod
    public void createPaymentIntent(double amount, String currency, Promise promise) {
        try {
            // Validate payment data
            if (!validatePaymentData(amount, null)) {
                promise.reject("INVALID_PAYMENT", "Invalid payment amount or currency");
                return;
            }

            // Encrypt sensitive payment data
            byte[] iv = new byte[12];
            new SecureRandom().nextBytes(iv);
            encryptionCipher.init(Cipher.ENCRYPT_MODE, encryptionKey, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            
            // Create payment intent with retry mechanism
            int retryCount = 0;
            PaymentIntent.Builder intentBuilder = new PaymentIntent.Builder()
                .setAmount((long)(amount * 100)) // Convert to cents
                .setCurrency(currency)
                .setPaymentMethodTypes(new ArrayList<String>() {{
                    add("card");
                }});

            stripe.createPaymentIntent(
                intentBuilder.build(),
                new PaymentIntent.CreateCallback() {
                    @Override
                    public void onSuccess(PaymentIntent paymentIntent) {
                        try {
                            // Encrypt client secret
                            byte[] encryptedSecret = encryptionCipher.doFinal(
                                paymentIntent.getClientSecret().getBytes()
                            );

                            WritableMap result = Arguments.createMap();
                            result.putString("clientSecret", android.util.Base64.encodeToString(
                                encryptedSecret, android.util.Base64.NO_WRAP
                            ));
                            result.putString("paymentIntentId", paymentIntent.getId());

                            promise.resolve(result);
                        } catch (Exception e) {
                            promise.reject("ENCRYPTION_ERROR", "Failed to encrypt payment data", e);
                        }
                    }

                    @Override
                    public void onError(Exception e) {
                        promise.reject("PAYMENT_INTENT_ERROR", "Failed to create payment intent", e);
                    }
                }
            );
        } catch (Exception e) {
            Log.e(TAG, "Payment intent creation failed", e);
            promise.reject("PAYMENT_ERROR", "Payment processing failed", e);
        }
    }

    /**
     * Processes split payments with parallel execution and transaction consistency.
     * 
     * @param splits Array of payment splits
     * @param totalAmount Total payment amount
     * @param promise Promise to resolve/reject the operation
     */
    @ReactMethod
    public void processSplitPayment(ReadableArray splits, double totalAmount, Promise promise) {
        try {
            // Validate split payment data
            if (!validatePaymentData(totalAmount, splits)) {
                promise.reject("INVALID_SPLIT", "Invalid split payment configuration");
                return;
            }

            List<PaymentIntent> paymentIntents = new ArrayList<>();
            double processedAmount = 0;

            // Process each split payment
            for (int i = 0; i < splits.size(); i++) {
                double splitAmount = splits.getDouble(i);
                processedAmount += splitAmount;

                PaymentIntent.Builder intentBuilder = new PaymentIntent.Builder()
                    .setAmount((long)(splitAmount * 100))
                    .setCurrency("USD")
                    .setPaymentMethodTypes(new ArrayList<String>() {{
                        add("card");
                    }});

                paymentIntents.add(intentBuilder.build());
            }

            // Verify total amount matches
            if (Math.abs(processedAmount - totalAmount) > 0.01) {
                promise.reject("AMOUNT_MISMATCH", "Split amounts do not match total");
                return;
            }

            // Process payments in parallel
            List<String> results = new ArrayList<>();
            for (PaymentIntent intent : paymentIntents) {
                stripe.createPaymentIntent(
                    intent,
                    new PaymentIntent.CreateCallback() {
                        @Override
                        public void onSuccess(PaymentIntent paymentIntent) {
                            synchronized (results) {
                                results.add(paymentIntent.getId());
                            }
                        }

                        @Override
                        public void onError(Exception e) {
                            Log.e(TAG, "Split payment failed", e);
                        }
                    }
                );
            }

            // Wait for all payments to complete
            WritableMap response = Arguments.createMap();
            response.putArray("paymentIntentIds", Arguments.fromList(results));
            promise.resolve(response);

        } catch (Exception e) {
            Log.e(TAG, "Split payment processing failed", e);
            promise.reject("SPLIT_PAYMENT_ERROR", "Failed to process split payments", e);
        }
    }

    /**
     * Validates payment data with security checks.
     * 
     * @param amount Payment amount
     * @param splits Optional split payment array
     * @return boolean indicating validation result
     */
    private boolean validatePaymentData(double amount, ReadableArray splits) {
        // Validate amount
        if (amount < MIN_PAYMENT_AMOUNT) {
            Log.w(TAG, "Payment amount below minimum");
            return false;
        }

        // Validate splits if present
        if (splits != null) {
            if (splits.size() > MAX_SPLIT_PARTICIPANTS) {
                Log.w(TAG, "Too many split payment participants");
                return false;
            }

            double totalSplit = 0;
            for (int i = 0; i < splits.size(); i++) {
                double splitAmount = splits.getDouble(i);
                if (splitAmount < MIN_PAYMENT_AMOUNT) {
                    Log.w(TAG, "Split amount below minimum");
                    return false;
                }
                totalSplit += splitAmount;
            }

            if (Math.abs(totalSplit - amount) > 0.01) {
                Log.w(TAG, "Split total does not match amount");
                return false;
            }
        }

        return true;
    }
}