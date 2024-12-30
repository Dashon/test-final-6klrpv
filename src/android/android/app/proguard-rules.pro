# AI Travel Platform ProGuard Rules
# Version: 1.0.0
# Build Tool: R8 3.0.0

# Global Optimization Settings
-optimizationpasses 5
-dontusemixedcaseclassnames
-verbose
-allowaccessmodification

# Keep Important Attributes
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-keepattributes SourceFile,LineNumberTable
-keepattributes Exceptions,StackTrace

# React Native Core (v0.71.x)
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.react.bridge.ReadableType

# React Native Bridge Protection
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.ReactActivity { *; }
-keep class com.facebook.react.ReactPackage { *; }
-keep class com.facebook.react.shell.MainReactPackage { *; }
-keep class com.facebook.jni.** { *; }

# JSC Runtime Protection (latest)
-keep class org.webkit.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Stripe Payment Module Protection (v20.25.8)
-keep class com.stripe.android.** { *; }
-keepclassmembers class com.stripe.android.** { *; }
-keep class com.aitravelplatform.modules.payment.** { *; }
-keepclassmembers class com.aitravelplatform.modules.payment.** {
    @com.facebook.react.bridge.ReactMethod *;
}

# Biometric Module Protection (v1.1.0)
-keep class androidx.biometric.** { *; }
-keep class com.aitravelplatform.modules.biometric.** { *; }
-keepclassmembers class com.aitravelplatform.modules.biometric.** {
    @com.facebook.react.bridge.ReactMethod *;
}

# Location Services Protection (v21.0.1)
-keep class com.google.android.gms.location.** { *; }
-keep class com.aitravelplatform.modules.location.** { *; }
-keepclassmembers class com.aitravelplatform.modules.location.** {
    @com.facebook.react.bridge.ReactMethod *;
}

# Advanced Security Measures
# String Encryption
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule {
    @com.facebook.react.bridge.ReactMethod <methods>;
}
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** i(...);
    public static *** v(...);
    public static *** w(...);
    public static *** e(...);
}

# Enhanced Optimization Rules
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*,!code/allocation/variable
-mergeinterfacesaggressively
-overloadaggressively
-repackageclasses 'com.aitravelplatform'
-flattenpackagehierarchy 'com.aitravelplatform'

# Native Method Protection
-keepclasseswithmembernames,includedescriptorclasses class * {
    native <methods>;
}

# Enum Protection
-keepclassmembers,allowoptimization enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Serialization Protection
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Remove Debugging Information
-renamesourcefileattribute SourceFile
-adaptresourcefilenames **.properties,**.xml
-adaptresourcefilecontents **.properties,**.xml

# Advanced Class Encryption
-classobfuscationdictionary 'proguard-class-dictionary.txt'
-packageobfuscationdictionary 'proguard-package-dictionary.txt'

# Crash Reporting Protection
-keepattributes LineNumberTable,SourceFile
-renamesourcefileattribute SourceFile

# Additional Security Measures
-dontskipnonpubliclibraryclasses
-dontskipnonpubliclibraryclassmembers
-allowaccessmodification
-useuniqueclassmembernames
-dontpreverify

# Keep Application Class
-keep public class com.aitravelplatform.MainApplication extends com.facebook.react.ReactApplication { *; }

# Final Optimization Settings
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**