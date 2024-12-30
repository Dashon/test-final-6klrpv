/**
 * Next.js Middleware Configuration
 * Version: 1.0.0
 * 
 * Implements comprehensive security, authentication, and routing controls
 * with advanced monitoring and professional route handling capabilities.
 * 
 * @packageDocumentation
 */

import { NextResponse } from 'next/server'; // ^13.4.0
import { NextRequest } from 'next/server'; // ^13.4.0
import { StatusCodes } from 'http-status-codes'; // ^2.2.0
import jwt from 'jsonwebtoken'; // ^9.0.0
import axiosInstance from './lib/axios';
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

// Route configuration constants
const PROTECTED_ROUTES = ['/dashboard', '/booking', '/chat', '/persona', '/profile'];
const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/health'];
const PROFESSIONAL_ROUTES = ['/professional', '/agent-management', '/analytics', '/consultation'];

// Security header configuration
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;",
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

// Rate limiting configuration
const RATE_LIMIT = {
  window: 60000, // 1 minute
  maxRequests: {
    public: 100,
    authenticated: 1000,
    professional: 5000
  }
};

// Type definitions
type UserRole = 'public' | 'user' | 'professional' | 'admin';

interface TokenValidationResult {
  isValid: boolean;
  userRole: UserRole;
  needsRefresh: boolean;
  userId?: string;
}

interface RoutePermissionResult {
  isAllowed: boolean;
  reason?: string;
  redirectUrl?: string;
}

/**
 * Validates JWT token and handles token refresh
 */
async function validateToken(token: string): Promise<TokenValidationResult> {
  try {
    const decoded = jwt.decode(token) as { exp: number; role: UserRole; sub: string } | null;
    
    if (!decoded) {
      return { isValid: false, userRole: 'public', needsRefresh: false };
    }

    const isExpired = decoded.exp * 1000 < Date.now();
    
    if (isExpired) {
      try {
        const response = await axiosInstance.post('/auth/refresh-token', { token });
        return {
          isValid: true,
          userRole: decoded.role,
          needsRefresh: true,
          userId: decoded.sub
        };
      } catch (error) {
        return { isValid: false, userRole: 'public', needsRefresh: false };
      }
    }

    return {
      isValid: true,
      userRole: decoded.role,
      needsRefresh: false,
      userId: decoded.sub
    };
  } catch (error) {
    return { isValid: false, userRole: 'public', needsRefresh: false };
  }
}

/**
 * Checks route permissions based on user role and path
 */
function checkRoutePermissions(pathname: string, userRole: UserRole): RoutePermissionResult {
  // Allow public routes and health check
  if (PUBLIC_ROUTES.includes(pathname) || pathname === '/health') {
    return { isAllowed: true };
  }

  // Check professional routes
  if (PROFESSIONAL_ROUTES.some(route => pathname.startsWith(route))) {
    if (userRole !== 'professional' && userRole !== 'admin') {
      return {
        isAllowed: false,
        reason: 'Professional access required',
        redirectUrl: '/login?required=professional'
      };
    }
  }

  // Check protected routes
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    if (userRole === 'public') {
      return {
        isAllowed: false,
        reason: 'Authentication required',
        redirectUrl: `/login?redirect=${encodeURIComponent(pathname)}`
      };
    }
  }

  return { isAllowed: true };
}

/**
 * Main middleware function implementing security and routing controls
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const requestId = uuidv4();
  const startTime = Date.now();
  const pathname = request.nextUrl.pathname;

  // Initialize response
  let response = NextResponse.next();

  try {
    // Apply security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Add request tracking headers
    response.headers.set('X-Request-ID', requestId);
    response.headers.set('X-Request-Start', startTime.toString());

    // Extract token
    const token = request.cookies.get('ai_travel_token')?.value || 
                 request.headers.get('authorization')?.replace('Bearer ', '');

    // Validate token and check permissions
    const { isValid, userRole, needsRefresh, userId } = token 
      ? await validateToken(token)
      : { isValid: false, userRole: 'public' as UserRole, needsRefresh: false };

    // Check route permissions
    const permissionResult = checkRoutePermissions(pathname, userRole);

    if (!permissionResult.isAllowed) {
      return NextResponse.redirect(
        new URL(permissionResult.redirectUrl || '/login', request.url)
      );
    }

    // Apply rate limiting
    const rateLimit = RATE_LIMIT.maxRequests[userRole === 'professional' ? 'professional' : 
                                           userRole === 'public' ? 'public' : 'authenticated'];
    
    // Add user context headers
    if (isValid && userId) {
      response.headers.set('X-User-ID', userId);
      response.headers.set('X-User-Role', userRole);
    }

    // Handle token refresh if needed
    if (needsRefresh && response.cookies) {
      // Token will be refreshed by validateToken function
      response.headers.set('X-Token-Refreshed', 'true');
    }

    // Add response timing header
    response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);

    return response;
  } catch (error) {
    // Log error and return appropriate response
    console.error('Middleware Error:', {
      requestId,
      pathname,
      error,
      duration: Date.now() - startTime
    });

    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Error-Code': 'MIDDLEWARE_ERROR'
        }
      }
    );
  }
}

/**
 * Middleware configuration for route matching
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};