/**
 * @file AndroidRipple.tsx
 * @version 1.0.0
 * 
 * A shared component implementing Material Design's ripple effect for Android
 * touchable elements with performance optimizations and accessibility support.
 * 
 * @requires react v18.x
 * @requires react-native v0.71.x
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  GestureResponderEvent,
  ViewStyle,
  Platform,
  PixelRatio
} from 'react-native';
import { colors } from '../../constants/colors';
import { getResponsiveSize } from '../../utils/responsive';

/**
 * Props interface for AndroidRipple component with enhanced configuration options
 */
interface AndroidRippleProps {
  children: React.ReactNode;
  color?: string;
  duration?: number;
  rippleSize?: number;
  disabled?: boolean;
  onPress?: () => void;
  minVelocity?: number;
  maxVelocity?: number;
  accessible?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Interface for managing ripple animation state
 */
interface Ripple {
  id: number;
  animation: Animated.Value;
  scale: Animated.Value;
  x: number;
  y: number;
  velocity: number;
}

/**
 * Default configuration values
 */
const DEFAULT_DURATION = 400;
const DEFAULT_MIN_VELOCITY = 0.1;
const DEFAULT_MAX_VELOCITY = 2.0;
const MIN_RIPPLE_SIZE = getResponsiveSize(44); // Minimum touch target size
const RIPPLE_OPACITY = 0.12;

/**
 * AndroidRipple Component
 * 
 * Implements Material Design ripple effect with:
 * - Native driver animations for performance
 * - Velocity-based animation timing
 * - Density-independent sizing
 * - Accessibility support
 */
const AndroidRipple: React.FC<AndroidRippleProps> = ({
  children,
  color = colors.primary.default,
  duration = DEFAULT_DURATION,
  rippleSize: propRippleSize,
  disabled = false,
  onPress,
  minVelocity = DEFAULT_MIN_VELOCITY,
  maxVelocity = DEFAULT_MAX_VELOCITY,
  accessible = true,
  accessibilityLabel,
  style
}) => {
  // State and refs
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextRippleId = useRef(0);
  const containerRef = useRef<View>(null);

  /**
   * Calculates ripple size based on touch velocity and constraints
   */
  const calculateRippleSize = useCallback((velocity: number): number => {
    const baseSize = propRippleSize || getResponsiveSize(100);
    const velocityFactor = Math.min(Math.max(velocity, minVelocity), maxVelocity);
    return PixelRatio.roundToNearestPixel(baseSize * velocityFactor);
  }, [propRippleSize, minVelocity, maxVelocity]);

  /**
   * Creates and animates a new ripple instance
   */
  const createRipple = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;

    const touch = event.nativeEvent;
    const velocity = Math.sqrt(
      Math.pow(touch.pageX - touch.locationX, 2) +
      Math.pow(touch.pageY - touch.locationY, 2)
    ) / duration;

    const rippleSize = calculateRippleSize(velocity);
    const rippleId = nextRippleId.current++;

    const animation = new Animated.Value(0);
    const scale = new Animated.Value(0);

    // Create new ripple
    const newRipple: Ripple = {
      id: rippleId,
      animation,
      scale,
      x: touch.locationX - rippleSize / 2,
      y: touch.locationY - rippleSize / 2,
      velocity
    };

    setRipples(current => [...current, newRipple]);

    // Animate ripple with native driver
    Animated.parallel([
      Animated.timing(animation, {
        toValue: 1,
        duration: duration * (1 / velocity),
        useNativeDriver: true
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: duration * (1 / velocity),
        useNativeDriver: true
      })
    ]).start(() => {
      // Cleanup after animation
      removeRipple(rippleId);
    });
  }, [disabled, duration, calculateRippleSize]);

  /**
   * Removes a ripple with fade-out animation
   */
  const removeRipple = useCallback((rippleId: number) => {
    setRipples(current => {
      const ripple = current.find(r => r.id === rippleId);
      if (!ripple) return current;

      Animated.timing(ripple.animation, {
        toValue: 0,
        duration: duration / 2,
        useNativeDriver: true
      }).start(() => {
        setRipples(current => current.filter(r => r.id !== rippleId));
      });

      return current;
    });
  }, [duration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      ripples.forEach(ripple => {
        ripple.animation.stopAnimation();
        ripple.scale.stopAnimation();
      });
    };
  }, [ripples]);

  return (
    <Pressable
      ref={containerRef}
      onPress={onPress}
      disabled={disabled}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[styles.container, style]}
      onPressIn={createRipple}
      android_ripple={null} // Disable default Android ripple
    >
      {children}
      {Platform.OS === 'android' && ripples.map(ripple => (
        <Animated.View
          key={ripple.id}
          style={[
            styles.ripple,
            {
              backgroundColor: color,
              opacity: ripple.animation.interpolate({
                inputRange: [0, 1],
                outputRange: [RIPPLE_OPACITY, 0]
              }),
              transform: [{ scale: ripple.scale }],
              left: ripple.x,
              top: ripple.y,
              width: calculateRippleSize(ripple.velocity),
              height: calculateRippleSize(ripple.velocity)
            }
          ]}
        />
      ))}
    </Pressable>
  );
};

/**
 * Optimized styles with static typing
 */
const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    minWidth: MIN_RIPPLE_SIZE,
    minHeight: MIN_RIPPLE_SIZE
  },
  ripple: {
    position: 'absolute',
    borderRadius: 9999, // Effectively makes it circular
    backgroundColor: colors.overlay.light
  }
});

export default AndroidRipple;