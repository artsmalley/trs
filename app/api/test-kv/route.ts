import { NextResponse } from "next/server";
import Redis from "ioredis";

// GET /api/test-kv - Test Redis connection
export async function GET() {
  let redis: Redis | null = null;

  try {
    // Create Redis client
    redis = new Redis(process.env.KV_REDIS_URL!);

    // Test write
    await redis.set("test:ping", JSON.stringify({ message: "Hello from Redis!", timestamp: Date.now() }));

    // Test read
    const data = await redis.get("test:ping");
    const result = data ? JSON.parse(data) : null;

    // Test delete
    await redis.del("test:ping");

    return NextResponse.json({
      success: true,
      message: "Redis is working with ioredis!",
      data: result,
      envVars: {
        hasKV_REDIS_URL: !!process.env.KV_REDIS_URL,
        usingPackage: "ioredis (direct connection)",
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        envVars: {
          hasKV_REDIS_URL: !!process.env.KV_REDIS_URL,
        }
      },
      { status: 500 }
    );
  } finally {
    // Clean up connection
    if (redis) {
      redis.disconnect();
    }
  }
}
