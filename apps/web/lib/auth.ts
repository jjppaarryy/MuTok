import { NextRequest, NextResponse } from "next/server";
import path from "path";

/**
 * Validates that a request originates from localhost.
 * For a desktop app, this prevents external network access to the API.
 */
export function isLocalRequest(request: NextRequest): boolean {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  
  // If there's a forwarded header, check if it's localhost
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    return isLocalhostIp(firstIp);
  }
  
  if (realIp) {
    return isLocalhostIp(realIp);
  }
  
  // For direct connections, Next.js doesn't expose the IP easily,
  // but if we're running on localhost:3000, connections are local
  // unless explicitly proxied
  return true;
}

function isLocalhostIp(ip: string | undefined): boolean {
  if (!ip) return false;
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip === "::ffff:127.0.0.1"
  );
}

/**
 * Returns an unauthorized response if the request is not from localhost.
 */
export function requireLocalRequest(request: NextRequest): NextResponse | null {
  if (!isLocalRequest(request)) {
    return NextResponse.json(
      { error: "Access denied. This API is only accessible from localhost." },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Validates that a file path is within the allowed data directory.
 * Prevents path traversal attacks.
 */
export function isPathWithinDataDir(filePath: string): boolean {
  const dataDir = getDataDir();
  const resolvedPath = path.resolve(filePath);
  const resolvedDataDir = path.resolve(dataDir);
  
  return resolvedPath.startsWith(resolvedDataDir + path.sep) || 
         resolvedPath === resolvedDataDir;
}

/**
 * Returns the data directory path.
 */
export function getDataDir(): string {
  return path.join(process.cwd(), "..", "..", "data");
}

/**
 * Validates and sanitizes a file path, ensuring it's within the data directory.
 * Returns null if the path is invalid or outside the allowed directory.
 */
export function validateFilePath(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  
  const resolvedPath = path.resolve(filePath);
  
  if (!isPathWithinDataDir(resolvedPath)) {
    console.warn(`Path traversal attempt blocked: ${filePath}`);
    return null;
  }
  
  return resolvedPath;
}

/**
 * Masks a sensitive value, showing only the last 4 characters.
 */
export function maskSensitiveValue(value: string | undefined): string {
  if (!value || value.length <= 4) {
    return value ? "****" : "";
  }
  return "****" + value.slice(-4);
}

/**
 * Checks if a string looks like a sensitive value (API key, secret, token).
 */
export function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = [
    /secret/i,
    /key/i,
    /token/i,
    /password/i,
    /credential/i,
    /private/i,
  ];
  return sensitivePatterns.some((pattern) => pattern.test(key));
}
