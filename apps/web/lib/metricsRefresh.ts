import { createTikTokClient } from "../../../packages/core/src/tiktok";
import { getValidAccessToken } from "./tiktokAuth";
import { getTikTokSettings } from "./tiktokSettings";
import { matchVideosToPlans, upsertMetrics, type TikTokVideo } from "./metrics";
import { updateArmStatsForPlan } from "./optimizer";
import { prisma } from "./prisma";
import { getRulesSettings } from "./settings";

type VideoListResponse = {
  data?: {
    videos?: unknown[];
    video_list?: unknown[];
  };
};

type MetricsResponse = {
  data?: {
    videos?: Array<Record<string, unknown>>;
    video_list?: Array<Record<string, unknown>>;
  };
};

type PublishStatusResponse = {
  data?: Record<string, unknown>;
};

type RefreshResult = {
  matched: number;
  results: Array<{ planId: string; videoId: string }>;
  debug?: {
    publishPlans: number;
    publishResolved: number;
    listVideos: number;
    listMatches: number;
  };
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const metricNumber = (metrics: Record<string, number | string | null | undefined>, keys: string[]) => {
  for (const key of keys) {
    const raw = metrics[key];
    const value = typeof raw === "string" ? Number(raw) : raw;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
};

const toRate = (value: number, views: number) => {
  if (views <= 0) return 0;
  if (value >= 0 && value <= 1) return value;
  return value / views;
};

const extractVideoIdFromPublishStatus = (payload: PublishStatusResponse): string | null => {
  const data = payload.data ?? {};
  const candidates = [
    data.video_id,
    (data.video as Record<string, unknown> | undefined)?.["id"],
    (data.video as Record<string, unknown> | undefined)?.["video_id"],
    (data.publish_status as Record<string, unknown> | undefined)?.["video_id"],
    (data.status as Record<string, unknown> | undefined)?.["video_id"],
    (data.share as Record<string, unknown> | undefined)?.["video_id"]
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  return null;
};

export async function runMetricsRefresh(): Promise<RefreshResult> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return { matched: 0, results: [] };
  }

  const settings = await getTikTokSettings();
  const rules = await getRulesSettings();
  const client = createTikTokClient({
    accessToken,
    sandbox: settings.sandbox
  });

  const publishPlans = await prisma.postPlan.findMany({
    where: { status: { in: ["UPLOADED_DRAFT", "POSTED", "METRICS_FETCHED"] }, tiktokPublishId: { not: null } },
    select: { id: true, tiktokPublishId: true }
  });
  const publishMatches: Array<{ planId: string; videoId: string }> = [];
  for (const plan of publishPlans) {
    if (!plan.tiktokPublishId) continue;
    try {
      const statusResponse = (await client.getPublishStatus(plan.tiktokPublishId)) as PublishStatusResponse;
      const videoId = extractVideoIdFromPublishStatus(statusResponse);
      if (videoId) {
        publishMatches.push({ planId: plan.id, videoId });
      }
    } catch {
      // Ignore per-plan status failures and fall back to list matching
    }
  }

  const response = (await client.queryVideoList({ max_count: 20 })) as VideoListResponse;
  const videos = (response.data?.videos ?? response.data?.video_list ?? []) as TikTokVideo[];
  const listMatches = await matchVideosToPlans(videos);
  const matchedMap = new Map<string, string>();
  publishMatches.forEach((match) => matchedMap.set(match.planId, match.videoId));
  listMatches.forEach((match) => matchedMap.set(match.planId, match.videoId));
  const matches = Array.from(matchedMap.entries()).map(([planId, videoId]) => ({ planId, videoId }));

  const results: Array<{ planId: string; videoId: string }> = [];
  for (const match of matches) {
    const metricsResponse = (await client.queryVideoMetrics({
      video_ids: [match.videoId]
    })) as MetricsResponse;
    const metricsData =
      metricsResponse.data?.videos?.[0] ?? metricsResponse.data?.video_list?.[0] ?? {};
    const metricValues = metricsData as Record<string, number | string | null | undefined>;
    const views = Number(metricValues.view_count ?? metricValues.views ?? 0);
    const likes = Number(metricValues.like_count ?? metricValues.likes ?? 0);
    const comments = Number(metricValues.comment_count ?? metricValues.comments ?? 0);
    const shares = Number(metricValues.share_count ?? metricValues.shares ?? 0);
    const saves = Number(metricValues.save_count ?? metricValues.saves ?? 0);
    const followerDeltaValue = metricValues.follower_delta ?? metricValues.followers_delta ?? null;
    const followerDelta =
      typeof followerDeltaValue === "number" ? followerDeltaValue : null;

    const avgWatchTime = metricNumber(metricValues, [
      "avg_watch_time",
      "average_watch_time",
      "avg_watch_time_sec",
      "average_watch_time_sec",
      "avg_watch_time_per_view"
    ]);
    const view2s = metricNumber(metricValues, ["view_2s", "view2s", "view_2s_count"]);
    const view6s = metricNumber(metricValues, ["view_6s", "view6s", "view_6s_count"]);
    const plan = await prisma.postPlan.findUnique({
      where: { id: match.planId },
      select: { snippetDurationSec: true }
    });
    const durationFallback = metricNumber(metricValues, ["video_duration", "duration", "video_length"]);
    const durationSec = Number(plan?.snippetDurationSec ?? durationFallback ?? 0);
    const retention = durationSec > 0 ? avgWatchTime / durationSec : 0;

    const view2Rate = toRate(view2s, views);
    const view6Rate = toRate(view6s, views);
    const saveRate = toRate(saves, views);
    const shareRate = toRate(shares, views);

    const rewardScore = clamp01(
      0.5 * clamp01(retention) +
        0.2 * clamp01(view2Rate) +
        0.2 * clamp01(view6Rate) +
        0.05 * clamp01(saveRate) +
        0.05 * clamp01(shareRate)
    );
    const createTimeRaw = metricValues.create_time ?? metricValues.createTime ?? undefined;
    const createTime = typeof createTimeRaw === "number" ? createTimeRaw : undefined;
    await upsertMetrics({
      planId: match.planId,
      videoId: match.videoId,
      metrics: {
        views,
        likes,
        comments,
        shares
      },
      createTime,
      rewardScore,
      view2Rate,
      view6Rate,
      retentionRate: clamp01(retention),
      followerDelta: typeof followerDelta === "number" ? followerDelta : undefined
    });
    await updateArmStatsForPlan({
      planId: match.planId,
      impressions: views,
      conversions: typeof followerDelta === "number" ? followerDelta : 0,
      reward: rewardScore,
      minViews: rules.optimiser_policy.min_views_before_counting
    });
    await prisma.postPlan.update({
      where: { id: match.planId },
      data: { status: "METRICS_FETCHED" }
    });
    results.push({ planId: match.planId, videoId: match.videoId });
  }

  return {
    matched: results.length,
    results,
    debug: {
      publishPlans: publishPlans.length,
      publishResolved: publishMatches.length,
      listVideos: videos.length,
      listMatches: listMatches.length
    }
  };
}
