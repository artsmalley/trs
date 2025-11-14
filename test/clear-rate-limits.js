// Clear rate limit keys from Redis
const Redis = require('ioredis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis(process.env.KV_REDIS_URL);

async function clearRateLimits() {
  try {
    console.log('Clearing rate limit keys...');
    const keys = await redis.keys('ratelimit:*');

    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`✓ Cleared ${keys.length} rate limit keys`);
    } else {
      console.log('✓ No rate limit keys to clear');
    }

    await redis.quit();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

clearRateLimits();
