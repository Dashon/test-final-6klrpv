//
//  AppDelegate.mm
//  AITravelPlatform
//
//  Created by AI Travel Platform Team
//  Copyright © 2024 AI Travel Platform. All rights reserved.
//

#import "AppDelegate.h"
#import <UIKit/UIKit.h>  // v12.0+
#import <React/RCTBridge.h>  // v0.71.x
#import <React/RCTBundleURLProvider.h>  // v0.71.x
#import <React/RCTRootView.h>  // v0.71.x
#import <React/RCTWebSocketExecutor.h>  // v0.71.x

@interface AppDelegate ()

@property (nonatomic, strong) RCTBridge *bridge;

@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    // Configure bridge initialization options with WebSocket support
    NSMutableDictionary *initOptions = [NSMutableDictionary new];
    [initOptions setObject:@YES forKey:@"enableWebSocket"];
    
    // Configure WebSocket executor
    RCTWebSocketExecutor *executor = [[RCTWebSocketExecutor alloc] init];
    [initOptions setObject:executor forKey:@"executor"];
    
    // Initialize React Native bridge
    self.bridge = [[RCTBridge alloc] initWithDelegate:self
                                         launchOptions:launchOptions];
    
    // Create the root view with the main component name
    RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:self.bridge
                                                    moduleName:@"AITravelPlatform"
                                             initialProperties:nil];
    
    // Configure root view background color
    rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f
                                                     green:1.0f
                                                      blue:1.0f
                                                     alpha:1];
    
    // Initialize and configure the main window
    self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
    UIViewController *rootViewController = [UIViewController new];
    rootViewController.view = rootView;
    self.window.rootViewController = rootViewController;
    
    // Configure WebSocket connection settings
    NSURLSessionConfiguration *configuration = [NSURLSessionConfiguration defaultSessionConfiguration];
    configuration.timeoutIntervalForRequest = 30.0;  // 30 second timeout
    configuration.timeoutIntervalForResource = 300.0;  // 5 minute resource timeout
    
    // Enable WebSocket compression
    [configuration setHTTPAdditionalHeaders:@{
        @"Sec-WebSocket-Extensions": @"permessage-deflate"
    }];
    
    // Make window visible
    [self.window makeKeyAndVisible];
    
    return YES;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
    // Development mode: Load from local dev server
    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"
                                                           fallbackResource:nil];
#else
    // Production mode: Load from bundled file
    return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

- (void)applicationDidReceiveMemoryWarning:(UIApplication *)application
{
    // Clear JavaScript cache if possible
    if (self.bridge) {
        [self.bridge.jsContext.JSGlobalContextRef garbageCollect];
    }
    
    // Log memory warning for debugging
    NSLog(@"Memory warning received - clearing caches");
    
    // Clear image caches
    [[NSURLCache sharedURLCache] removeAllCachedResponses];
    
    // Notify React Native of memory pressure
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTJavaScriptMemoryPressure"
                                                      object:nil];
}

// Handle background/foreground transitions
- (void)applicationWillResignActive:(UIApplication *)application
{
    // Notify React Native of app entering background
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTApplicationWillResignActive"
                                                      object:nil];
}

- (void)applicationDidBecomeActive:(UIApplication *)application
{
    // Notify React Native of app entering foreground
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTApplicationDidBecomeActive"
                                                      object:nil];
}

// Clean up resources on termination
- (void)applicationWillTerminate:(UIApplication *)application
{
    // Invalidate and clear bridge
    if (self.bridge) {
        [self.bridge invalidate];
        self.bridge = nil;
    }
}

@end