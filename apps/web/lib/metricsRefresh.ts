import { createTikTokClient } from "../../../packages/core/src/tiktok";
import { getValidAccessToken } from "./tiktokAuth";
import { getTikTokSettings } from "./tiktokSettings";
import { matchVideosToPlans, upsertMetrics } from "./metrics";
import { updateArmStatsForPlan } from "./optimizer";
import { prisma } from "./prisma";
import { getRulesSettings } from "./settings";

type RefreshResult = {
  matched: number;
  results: Array<{ planId: string; videoId: string }>;
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

  const response = await client.queryVideoList({ max_count: 20 });
  const videos =
    (response as any)?.data?.videos ?? (response as any)?.data?.video_list ?? [];
  const matches = await matchVideosToPlans(videos);

  const results: Array<{ planId: string; videoId: string }> = [];
  for (const match of matches) {
    const metricsResponse = await client.queryVideoMetrics({
      video_ids: [match.videoId]
    });
    const metricsData =
      (metricsResponse as any)?.data?.videos?.[0] ??
      (metricsResponse as any)?.data?.video_list?.[0] ??
      {};
    const views = metricsData.view_count ?? metricsData.views ?? 0;
    const likes = metricsData.like_count ?? metricsData.likes ?? 0;
    const comments = metricsData.comment_count ?? metricsData.comments ?? 0;
    const shares = metricsData.share_count ?? metricsData.shares ?? 0;
    const saves = metricsData.save_count ?? metricsData.saves ?? 0;
    const followerDelta = metricsData.follower_delta ?? metricsData.followers_delta ?? null;
    const rewardScore = views
      ? typeof followerDelta === "number"
        ? (followerDelta / views) * 1000
        : ((comments + shares * 2 + saves * 2) / views) * 1000
      : 0;
    await upsertMetrics({
      planId: match.planId,
      videoId: match.videoId,
      metrics: {
        views,
        likes,
        comments,
        shares
      },
      createTime: metricsData.create_time ?? metricsData.createTime,
      rewardScore,
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

  return { matched: results.length, results };
}
