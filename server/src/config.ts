// Shared configuration

// JWT secret must be set via environment variable; no insecure fallback.
export const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
})();
