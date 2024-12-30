'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';

// Validation schemas using Zod
const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  preferences: z.object({
    language: z.string(),
    theme: z.enum(['light', 'dark', 'system']),
    notifications: z.object({
      email: z.object({
        marketing: z.boolean(),
        bookingUpdates: z.boolean(),
        securityAlerts: z.boolean(),
        chatMessages: z.boolean()
      }),
      push: z.object({
        chatMessages: z.boolean(),
        bookingReminders: z.boolean(),
        promotionalOffers: z.boolean()
      }),
      inApp: z.object({
        mentions: z.boolean(),
        replies: z.boolean(),
        systemUpdates: z.boolean()
      })
    }),
    accessibility: z.object({
      fontSize: z.number().min(12).max(24),
      highContrast: z.boolean(),
      reduceMotion: z.boolean()
    })
  })
});

const passwordSchema = z.object({
  currentPassword: z.string().min(8, 'Password must be at least 8 characters'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 
      'Password must contain uppercase, lowercase, number and special character'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const ProfilePage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile form handling
  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      preferences: user?.preferences || {
        language: 'en',
        theme: 'system',
        notifications: {
          email: {
            marketing: false,
            bookingUpdates: true,
            securityAlerts: true,
            chatMessages: false
          },
          push: {
            chatMessages: true,
            bookingReminders: true,
            promotionalOffers: false
          },
          inApp: {
            mentions: true,
            replies: true,
            systemUpdates: true
          }
        },
        accessibility: {
          fontSize: 16,
          highContrast: false,
          reduceMotion: false
        }
      }
    }
  });

  // Password form handling
  const {
    register: passwordRegister,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema)
  });

  useEffect(() => {
    if (user) {
      resetProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        preferences: user.preferences
      });
    }
  }, [user, resetProfile]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setIsUpdating(true);
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error('Profile update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setIsChangingPassword(true);
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      toast.success('Password changed successfully');
      resetPassword();
    } catch (error) {
      toast.error('Failed to change password');
      console.error('Password change error:', error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

      {/* Personal Information Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Personal Information</h2>
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                {...profileRegister('firstName')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                aria-invalid={!!profileErrors.firstName}
                aria-describedby={profileErrors.firstName ? 'firstName-error' : undefined}
              />
              {profileErrors.firstName && (
                <p id="firstName-error" className="mt-1 text-sm text-red-600">
                  {profileErrors.firstName.message}
                </p>
              )}
            </div>
            
            {/* Similar input fields for lastName, email, and preferences... */}
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="w-full md:w-auto px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {isUpdating ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </section>

      {/* Password Change Section */}
      <section className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Change Password</h2>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
          {/* Password fields... */}
          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full md:w-auto px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {isChangingPassword ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* Preferences Section */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6">Preferences</h2>
        {/* Preferences form fields... */}
      </section>
    </div>
  );
};

export default ProfilePage;