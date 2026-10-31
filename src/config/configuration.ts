export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appName: process.env.APP_NAME ?? 'Real Estate API',
  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },
  enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  auth: {
    cookieEnabled: process.env.AUTH_COOKIE_ENABLED !== 'false',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
    cookieSameSite: process.env.COOKIE_SAMESITE ?? 'lax',
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    cookiePathScoped: process.env.COOKIE_PATH_SCOPED !== 'false',
  },
  passwordReset: {
    expiresHours: parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_HOURS ?? '1', 10),
  },
  appPublicUrl: process.env.APP_PUBLIC_URL ?? 'http://localhost:3000',
  storage: {
    driver: process.env.STORAGE_DRIVER ?? 'local',
    localUploadDir: process.env.LOCAL_UPLOAD_DIR ?? 'uploads',
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3001',
    maxUploadSizeBytes: parseInt(process.env.MAX_UPLOAD_SIZE_BYTES ?? '5242880', 10),
    s3: {
      bucket: process.env.S3_BUCKET ?? '',
      region: process.env.S3_REGION ?? '',
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      endpoint: process.env.S3_ENDPOINT ?? '',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
      apiKey: process.env.CLOUDINARY_API_KEY ?? '',
      apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    },
  },
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60', 10),
    limit: parseInt(process.env.RATE_LIMIT_LIMIT ?? '100', 10),
    authTtl: parseInt(process.env.AUTH_RATE_LIMIT_TTL ?? '900', 10),
    authLimit: parseInt(process.env.AUTH_RATE_LIMIT_LIMIT ?? '10', 10),
  },
});
