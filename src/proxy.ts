import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);
const isAuthOnlyRoute = createRouteMatcher(['/lock(.*)', '/setup(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Public routes: no auth needed
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId } = await auth();

  // No Clerk session at all
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Lock + setup routes: Clerk session required but PIN cookie not required
  if (isAuthOnlyRoute(req)) return NextResponse.next();

  // All other (app) routes: also require valid PIN cookie
  const cookie = req.cookies.get('pin_unlocked')?.value;
  const secret = process.env.PIN_SESSION_SECRET;
  if (!cookie || !secret) {
    return NextResponse.redirect(new URL('/lock', req.url));
  }
  const payload = verifySession(cookie, secret);
  if (!payload || payload.userId !== userId) {
    return NextResponse.redirect(new URL('/lock', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/'],
};
