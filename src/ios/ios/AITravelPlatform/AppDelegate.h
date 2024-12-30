//
//  AppDelegate.h
//  AITravelPlatform
//
//  Created by AI Travel Platform Team
//  Copyright © 2024 AI Travel Platform. All rights reserved.
//

#import <UIKit/UIKit.h>  // UIKit v12.0+
#import <React/RCTBridgeDelegate.h>  // React Native v0.71.x

NS_ASSUME_NONNULL_BEGIN

/**
 * @class AppDelegate
 * @brief Main application delegate class for the AI Travel Platform iOS app.
 *
 * This class serves as the primary delegate for the iOS application lifecycle and React Native bridge initialization.
 * It implements both UIApplicationDelegate for iOS app lifecycle management and RCTBridgeDelegate for React Native integration.
 *
 * Key responsibilities:
 * - Managing application lifecycle events
 * - Initializing and configuring the React Native bridge
 * - Setting up the root view hierarchy
 * - Providing the JavaScript bundle URL for React Native
 *
 * @note This class is designed to work with iOS 12.0 and above, using ARC memory management.
 */
@interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate>

/**
 * The main window of the application.
 * This property holds the reference to the app's primary window where the React Native
 * root view controller will be displayed.
 */
@property (nonatomic, strong) UIWindow *window;

/**
 * Primary initialization method called when the application launches.
 *
 * @param application The singleton app instance.
 * @param launchOptions Dictionary containing launch options.
 * @return Boolean indicating successful launch completion.
 */
- (BOOL)application:(UIApplication *)application 
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions;

/**
 * Provides the URL for the React Native JavaScript bundle.
 * Implementation of RCTBridgeDelegate protocol method.
 *
 * @param bridge The React Native bridge instance requesting the bundle URL.
 * @return NSURL pointing to the JavaScript bundle location.
 */
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge;

@end

NS_ASSUME_NONNULL_END