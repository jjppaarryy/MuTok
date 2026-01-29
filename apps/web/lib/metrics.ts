import { prisma } from "./prisma";
import { getRulesSettings } from "./settings";

type TikTokVideo = {
  id?: string;
  video_id?: string;
  desc?: string;
  title?: string;
  create_time?: number;
  duration?: number;
  duration_ms?: number;
};

type TikTokMetrics = {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
};

const extractCaption = (video: TikTokVideo) => {
  return video.desc ?? video.title ?? "";
};

const findMarker = (caption: string, prefix: string) => {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = caption.match(new RegExp(`${escaped}[a-zA-Z0-9]+`));
  return match ? match[0] : null;
};

const stripMarker = (caption: string, prefix: string) => {
  const marker = findMarker(caption, prefix);
  return marker ? caption.replace(marker, "").trim() : caption;
};

const tokenScore = (caption: string, planCaption: string) => {
  const tokenize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((token) => token.length > 2);
  const a = new Set(tokenize(caption));
  const b = tokenize(planCaption);
  let hits = 0;
  for (const token of b) {
    if (a.has(token)) hits += 1;
  }
  return hits;
};

export async function matchVideosToPlans(videos: TikTokVideo[]) {
  const settings = await getRulesSettings();
  const plans = await prisma.postPlan.findMany({
    where: { status: { in: ["UPLOADED_DRAFT", "POSTED"] } }
  });

  const planMarkers = new Map<string, string>();
  for (const plan of plans) {
    const marker = settings.caption_marker_enabled
      ? findMarker(plan.caption, settings.caption_marker_prefix)
      : null;
    if (marker) {
      planMarkers.set(marker, plan.id);
    }
  }

  const matches: Array<{ planId: string; videoId: string; caption: string }> = [];

  for (const video of videos) {
    const caption = extractCaption(video);
    const videoId = video.id ?? video.video_id;
    if (!videoId) continue;

    if (settings.caption_marker_enabled) {
      const marker = findMarker(caption, settings.caption_marker_prefix);
      if (marker && planMarkers.has(marker)) {
        matches.push({ planId: planMarkers.get(marker)!, videoId, caption });
        continue;
      }
    }

    const createTime = video.create_time ? video.create_time * 1000 : null;
    const videoDuration =
      typeof video.duration === "number"
        ? video.duration
        : typeof video.duration_ms === "number"
        ? video.duration_ms / 1000
        : null;
    const windowMs = settings.metrics_match_window_minutes * 60 * 1000;
    const candidates = plans
      .map((plan) => {
        const planTime = plan.scheduledFor.getTime();
        const timeDiff = createTime ? Math.abs(createTime - planTime) : null;
        const captionScore = tokenScore(
          caption,
          stripMarker(plan.caption, settings.caption_marker_prefix)
        );
        const durationDiff =
          videoDuration && plan.snippetDurationSec
            ? Math.abs(videoDuration - plan.snippetDurationSec)
            : null;
        return { plan, timeDiff, captionScore, durationDiff };
      })
      .filter((candidate) =>
        candidate.timeDiff === null
          ? candidate.captionScore > 0
          : candidate.timeDiff <= windowMs
      )
      .filter((candidate) =>
        candidate.durationDiff === null ? true : candidate.durationDiff <= 3
      )
      .sort((a, b) => {
        if (a.captionScore !== b.captionScore) {
          return b.captionScore - a.captionScore;
        }
        if (a.durationDiff !== null && b.durationDiff !== null) {
          return a.durationDiff - b.durationDiff;
        }
        if (a.timeDiff === null || b.timeDiff === null) return 0;
        return a.timeDiff - b.timeDiff;
      });

    if (candidates.length > 0) {
      matches.push({
        planId: candidates[0].plan.id,
        videoId,
        caption
      });
    }
  }

  return matches;
}

export async function upsertMetrics(params: {
  planId: string;
  videoId: string;
  metrics: TikTokMetrics;
  createTime?: number;
  rewardScore?: number;
  followerDelta?: number;
}) {
  const existing = await prisma.metric.findFirst({
    where: { tiktokVideoId: params.videoId }
  });

  const data = {
    postPlanId: params.planId,
    tiktokVideoId: params.videoId,
    createTime: params.createTime
      ? new Date(params.createTime * 1000)
      : new Date(),
    views: params.metrics.views ?? 0,
    likes: params.metrics.likes ?? 0,
    comments: params.metrics.comments ?? 0,
    shares: params.metrics.shares ?? 0,
    rewardScore: params.rewardScore,
    followerDelta: params.followerDelta,
    collectedAt: new Date()
  };

  if (existing) {
    return prisma.metric.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.metric.create({ data });
}
