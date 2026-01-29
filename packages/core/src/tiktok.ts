export type TikTokTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scopes: string[];
  openId: string;
};

export type TikTokClientOptions = {
  accessToken: string;
  sandbox: boolean;
};

const BASE_URL = "https://open.tiktokapis.com";

async function tiktokFetch<T>(
  endpoint: string,
  options: RequestInit,
  retryCount = 0
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, options);

  if (response.status === 429 && retryCount < 3) {
    const waitMs = 500 * Math.pow(2, retryCount);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return tiktokFetch(endpoint, options, retryCount + 1);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TikTok API error (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

export function createTikTokClient(options: TikTokClientOptions) {
  const headers = {
    Authorization: `Bearer ${options.accessToken}`,
    "Content-Type": "application/json"
  };

  return {
    async getCreatorInfo() {
      return tiktokFetch("/v2/post/publish/creator_info/query/", {
        method: "POST",
        headers
      });
    },

    async initializeUpload(payload: Record<string, unknown>) {
      return tiktokFetch("/v2/post/publish/video/init/", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
    },

    async uploadVideo(uploadUrl: string, fileBuffer: ArrayBuffer) {
      const fileSize = fileBuffer.byteLength;
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": fileSize.toString(),
          "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`
        },
        body: fileBuffer
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`TikTok upload error (${response.status}): ${text}`);
      }
      return response;
    },

    async queryVideoList(payload: Record<string, unknown>) {
      return tiktokFetch("/v2/video/list/", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
    },

    async queryVideoMetrics(payload: Record<string, unknown>) {
      return tiktokFetch("/v2/video/query/", {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
    },

    async getPublishStatus(publishId: string) {
      return tiktokFetch("/v2/post/publish/status/fetch/", {
        method: "POST",
        headers,
        body: JSON.stringify({ publish_id: publishId })
      });
    }
  };
}
