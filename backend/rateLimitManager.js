/**
 * Rate Limit Manager for GitHub OAuth API
 * 
 * Provides intelligent rate limit handling, caching, and retry mechanisms
 * to prevent OAuth failures and optimize API usage for multiple users.
 */

class RateLimitManager {
  constructor() {
    // Track rate limits per user
    this.userRateLimits = new Map();
    
    // Cache for API responses to reduce requests
    this.responseCache = new Map();
    
    // Default cache TTL (5 minutes)
    this.defaultCacheTTL = 5 * 60 * 1000;
    
    // Rate limit thresholds
    this.warningThreshold = 100; // Warn when less than 100 requests remaining
    this.criticalThreshold = 10;  // Block when less than 10 requests remaining
  }

  /**
   * Get rate limit info for a user
   */
  getUserRateLimit(userId) {
    return this.userRateLimits.get(userId) || {
      remaining: 5000,
      limit: 5000,
      reset: Date.now() + (60 * 60 * 1000), // 1 hour from now
      lastUpdated: Date.now()
    };
  }

  /**
   * Update rate limit info from GitHub API response headers
   */
  updateRateLimit(userId, headers) {
    const remaining = parseInt(headers['x-ratelimit-remaining']) || 0;
    const limit = parseInt(headers['x-ratelimit-limit']) || 5000;
    const reset = parseInt(headers['x-ratelimit-reset']) * 1000; // Convert to milliseconds

    const rateLimitInfo = {
      remaining,
      limit,
      reset,
      lastUpdated: Date.now()
    };

    this.userRateLimits.set(userId, rateLimitInfo);

    console.log(`📊 Rate limit updated for user ${userId}: ${remaining}/${limit} remaining, resets at ${new Date(reset).toLocaleTimeString()}`);

    return rateLimitInfo;
  }

  /**
   * Check if a request should be allowed based on rate limits
   */
  canMakeRequest(userId) {
    const rateLimit = this.getUserRateLimit(userId);
    const now = Date.now();

    // If rate limit has reset, allow request
    if (now >= rateLimit.reset) {
      return { allowed: true, reason: 'rate_limit_reset' };
    }

    // If we're below critical threshold, block request
    if (rateLimit.remaining <= this.criticalThreshold) {
      const waitTime = Math.ceil((rateLimit.reset - now) / (1000 * 60)); // Minutes
      return { 
        allowed: false, 
        reason: 'rate_limit_critical',
        waitMinutes: waitTime,
        resetTime: new Date(rateLimit.reset)
      };
    }

    // If we're below warning threshold, warn but allow
    if (rateLimit.remaining <= this.warningThreshold) {
      return { 
        allowed: true, 
        reason: 'rate_limit_warning',
        remaining: rateLimit.remaining
      };
    }

    return { allowed: true, reason: 'ok' };
  }

  /**
   * Generate cache key for API requests
   */
  getCacheKey(endpoint, userId, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${userId}:${endpoint}:${paramString}`;
  }

  /**
   * Get cached response if available and not expired
   */
  getCachedResponse(cacheKey) {
    const cached = this.responseCache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expiresAt) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    console.log(`💾 Cache hit for key: ${cacheKey}`);
    return cached.data;
  }

  /**
   * Cache API response
   */
  cacheResponse(cacheKey, data, ttl = this.defaultCacheTTL) {
    this.responseCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + ttl,
      cachedAt: Date.now()
    });

    console.log(`💾 Cached response for key: ${cacheKey} (TTL: ${ttl}ms)`);
  }

  /**
   * Clear expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.responseCache.entries()) {
      if (now > value.expiresAt) {
        this.responseCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      totalEntries: this.responseCache.size,
      userRateLimits: this.userRateLimits.size,
      cacheKeys: Array.from(this.responseCache.keys())
    };
  }

  /**
   * Clear all cache for a specific user (e.g., on logout)
   */
  clearUserCache(userId) {
    let cleared = 0;
    
    for (const [key] of this.responseCache.entries()) {
      if (key.startsWith(`${userId}:`)) {
        this.responseCache.delete(key);
        cleared++;
      }
    }

    this.userRateLimits.delete(userId);
    
    console.log(`🧹 Cleared ${cleared} cache entries for user ${userId}`);
  }
}

// Export singleton instance
module.exports = new RateLimitManager();
