// RequireAdmin Middleware
// Route guard that ensures only ADMIN users can access admin routes
// Redirects non-admin users to regular dashboard

// TODO: Implement admin route guard
// TODO: Check if user is authenticated
// TODO: Check if user.role === 'ADMIN'
// TODO: Redirect non-admin users to /dashboard
// TODO: Show loading state while checking

export default function RequireAdmin({ children }: { children: JSX.Element }) {
  // TODO: Implement admin check logic
  return children;
}

