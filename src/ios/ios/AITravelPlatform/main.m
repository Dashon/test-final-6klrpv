//
//  main.m
//  AITravelPlatform
//
//  Created by AI Travel Platform Team
//  Copyright © 2024 AI Travel Platform. All rights reserved.
//

#import <UIKit/UIKit.h>  // UIKit v12.0+
#import "AppDelegate.h"

/**
 * @brief Main entry point for the AI Travel Platform iOS application.
 *
 * This function serves as the primary entry point for the iOS application,
 * initializing the UIApplication instance with our custom AppDelegate for
 * React Native support. It implements proper memory management through
 * autorelease pool and includes exception handling for launch-time errors.
 *
 * Key responsibilities:
 * - Setting up autorelease pool for memory management
 * - Initializing UIApplication with custom AppDelegate
 * - Managing the main run loop
 * - Handling launch-time exceptions
 *
 * @param argc Number of command-line arguments
 * @param argv Array of command-line argument strings
 * @return int Exit code (0 for success, non-zero for failure)
 */
int main(int argc, char * argv[]) {
    // Create autorelease pool for memory management during launch
    @autoreleasepool {
        // Wrap the main initialization in a try-catch block to handle any launch-time exceptions
        @try {
            // Initialize the UIApplication with our custom AppDelegate
            // This will trigger the application:didFinishLaunchingWithOptions: method
            // in our AppDelegate class to set up the React Native bridge
            return UIApplicationMain(argc, argv, nil, NSStringFromClass([AppDelegate class]));
        }
        @catch (NSException *exception) {
            // Log any exceptions that occur during launch
            NSLog(@"Application launch failed with exception: %@", exception);
            NSLog(@"Stack trace: %@", [exception callStackSymbols]);
            return 1; // Return non-zero to indicate launch failure
        }
    }
}