import { prisma } from "./prisma";
import { logRunEvent } from "./logs";
import { getDailyDraftUploadCount, getDraftCount, getPendingShareCount24h, canUploadMore } from "./queue";
import { getRulesSettings } from "./settings";
import { DateTime } from "luxon";
import { isCooldownActive, setCooldown, getTikTokSettings } from "./tiktokSettings";
import { buildPlans } from "./planner";
import { renderPostPlan } from "./render";
import { createTikTokClient } from "../../../packages/core/src/tiktok";
import { getValidAccessToken } from "./tiktokAuth";
import { readFile, stat } from "fs/promises";
import { runMetricsRefresh } from "./metricsRefresh";
import { promoteRetireArms } from "./optimizer";
import { getRecoveryStatus } from "./recoveryMode";

type UploadInitResponse = {
  data?: {
    upload_url?: string;
    publish_id?: string;
  };
};

type RenderSummary = { rendered: number; failed: number };
type UploadSummary = { uploaded: number; skippedReason?: string };
export type PipelineSummary = {
  planned: number;
  rendered: number;
  uploaded: number;
  skippedUploadReason?: string;
  warnings: string[];
};

const mapPrivacyLevel = (visibility: string): string => {
  switch (visibility) {
    case "PUBLIC":
      return "PUBLIC_TO_EVERYONE";
    case "FRIENDS":
      return "MUTUAL_FOLLOW_FRIENDS";
    case "PRIVATE":
    default:
      return "SELF_ONLY";
  }
};

const renderPending = async (limit: number): Promise<RenderSummary> => {
  const renderPlans = await prisma.postPlan.findMany({
    where: { status: "PLANNED" },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  let rendered = 0;
  let failed = 0;
  for (const plan of renderPlans) {
    try {
      await renderPostPlan(plan.id);
      rendered += 1;
    } catch (error) {
      failed += 1;
      await prisma.postPlan.update({
        where: { id: plan.id },
        data: { status: "FAILED" }
      });
    }
  }

  return { rendered, failed };
};

const uploadRendered = async (
  limit: number,
  pendingCount: number,
  dailyUploads: number,
  rules: Awaited<ReturnType<typeof getRulesSettings>>
): Promise<UploadSummary> => {
  if (dailyUploads >= rules.spam_guardrails.daily_draft_upload_cap) {
    await logRunEvent({
      runType: "daily_upload_cap",
      status: "WARN",
      payloadExcerpt: `dailyUploads=${dailyUploads}`
    });
    return { uploaded: 0, skippedReason: "Daily upload cap reached." };
  }
  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    await logRunEvent({
      runType: "upload_skipped",
      status: "WARN",
      payloadExcerpt: "Missing TikTok access token"
    });
    return { uploaded: 0, skippedReason: "TikTok connection missing or expired." };
  }

  const tiktokSettings = await getTikTokSettings();
  const client = createTikTokClient({
    accessToken,
    sandbox: tiktokSettings.sandbox
  });

  await client.getCreatorInfo();

  const remainingUploads = Math.max(0, rules.spam_guardrails.daily_draft_upload_cap - dailyUploads);
  const maxUploads = Math.min(pendingCount <= 1 ? 2 : 1, remainingUploads);
  const uploadPlans = await prisma.postPlan.findMany({
    where: { status: "RENDERED" },
    orderBy: { createdAt: "asc" },
    take: Math.min(limit, maxUploads)
  });
  if (uploadPlans.length === 0) {
    await logRunEvent({
      runType: "upload_skipped",
      status: "WARN",
      payloadExcerpt: "No rendered drafts available"
    });
    return { uploaded: 0, skippedReason: "No rendered drafts available to upload." };
  }

  let uploaded = 0;
  let missingUploadUrl = 0;
  for (const plan of uploadPlans) {
    if (!plan.renderPath) {
      continue;
    }
    const fileStats = await stat(plan.renderPath);
    const exportDefaults = tiktokSettings.export_defaults;
    const baseTitle = (plan.caption || exportDefaults.caption || "Draft from TikTok Growth Agent").trim();
    const title = baseTitle.length > 2200 ? `${baseTitle.slice(0, 2197)}...` : baseTitle;
    const privacyLevel = tiktokSettings.sandbox ? "SELF_ONLY" : mapPrivacyLevel(exportDefaults.visibility ?? "PUBLIC");
    const initResponse = (await client.initializeUpload({
      post_info: {
        title,
        privacy_level: privacyLevel,
        disable_comment: !exportDefaults.allowComment,
        disable_duet: !exportDefaults.allowDuet,
        disable_stitch: !exportDefaults.allowStitch,
        branded_content: exportDefaults.brandedContent,
        brand_content_toggle: exportDefaults.promoteYourself
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: fileStats.size,
        chunk_size: fileStats.size,
        total_chunk_count: 1
      }
    })) as UploadInitResponse;
    const uploadUrl = initResponse.data?.upload_url;
    if (!uploadUrl) {
      missingUploadUrl += 1;
      continue;
    }
    const buffer = await readFile(plan.renderPath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
    try {
      await client.uploadVideo(uploadUrl, arrayBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      if (message.includes("spam_risk")) {
        await setCooldown(24);
        await logRunEvent({
          runType: "upload_spam_risk",
          status: "WARN",
          payloadExcerpt: message
        });
        break;
      }
      throw error;
    }
    await prisma.postPlan.update({
      where: { id: plan.id },
      data: {
        status: "UPLOADED_DRAFT",
        tiktokPublishId: initResponse.data?.publish_id ?? null
      }
    });
    uploaded += 1;
  }

  if (uploaded === 0 && missingUploadUrl > 0) {
    await logRunEvent({
      runType: "upload_skipped",
      status: "WARN",
      payloadExcerpt: "TikTok upload URL missing"
    });
    return { uploaded, skippedReason: "TikTok upload initialization failed." };
  }
  return { uploaded };
};

const parseWindow = (now: DateTime, value: string, jitterMinutes: number) => {
  const parts = value.split("-");
  const parseTime = (time: string) => {
    const [hour, minute] = time.split(":").map(Number);
    return now.set({ hour, minute, second: 0, millisecond: 0 });
  };
  const start = parseTime(parts[0]);
  const end = parts[1] ? parseTime(parts[1]) : start.plus({ minutes: Math.max(1, jitterMinutes) });
  return { start, end };
};

const pickTimeInWindow = (window: { start: DateTime; end: DateTime }, jitterMinutes: number) => {
  const rangeMinutes = Math.max(0, window.end.diff(window.start, "minutes").minutes);
  const jitter = Math.min(Math.max(0, jitterMinutes), Math.floor(rangeMinutes));
  const offset = jitter > 0 ? Math.floor(Math.random() * (jitter + 1)) : 0;
  return window.start.plus({ minutes: offset });
};

const getNextWindowTime = async (
  now: DateTime,
  rules: Awaited<ReturnType<typeof getRulesSettings>>
) => {
  const windows = rules.post_time_windows;
  const jitter = rules.spam_guardrails.window_jitter_minutes;
  const minGapHours = rules.spam_guardrails.min_gap_hours;
  const lastPlan = await prisma.postPlan.findFirst({
    where: { status: { not: "FAILED" } },
    orderBy: { scheduledFor: "desc" },
    select: { scheduledFor: true }
  });

  const getCandidate = (dayOffset: number) => {
    const dayNow = now.plus({ days: dayOffset });
    const ranges = windows
      .map((window) => parseWindow(dayNow, window, jitter))
      .sort((a, b) => a.start.toMillis() - b.start.toMillis());
    for (const range of ranges) {
      if (dayOffset === 0 && range.end <= now) continue;
      const scheduled = pickTimeInWindow(range, jitter);
      if (dayOffset === 0 && scheduled <= now) continue;
      if (
        lastPlan &&
        scheduled.diff(DateTime.fromJSDate(lastPlan.scheduledFor), "hours").hours < minGapHours
      ) {
        continue;
      }
      return scheduled;
    }
    return null;
  };

  return getCandidate(0) ?? getCandidate(1) ?? now.plus({ hours: minGapHours });
};

export async function runScheduledCycle(): Promise<PipelineSummary> {
  const rules = await getRulesSettings();
  const recovery = await getRecoveryStatus(rules);
  const postedCount = await prisma.postPlan.count({ where: { status: "POSTED" } });
  const rampCadence = postedCount < 6 ? 2 : rules.cadence_per_day;
  const effectiveCadence = recovery.active ? rules.recovery_mode.cadence_per_day : rampCadence;
  const draftCount = await getDraftCount();
  const pendingCount = await getPendingShareCount24h();
  const dailyUploads = await getDailyDraftUploadCount();
  const warnings: string[] = [];

  if (!canUploadMore(pendingCount) || pendingCount >= 4 || draftCount >= rules.spam_guardrails.pending_drafts_cap) {
    await logRunEvent({
      runType: "pending_throttle",
      status: "WARN",
      payloadExcerpt: `pendingCount=${pendingCount},drafts=${draftCount}`
    });
    return {
      planned: 0,
      rendered: 0,
      uploaded: 0,
      skippedUploadReason: "Pending drafts cap reached.",
      warnings
    };
  }

  if (await isCooldownActive()) {
    await logRunEvent({
      runType: "upload_skipped",
      status: "WARN",
      payloadExcerpt: "Upload cooldown active"
    });
    return {
      planned: 0,
      rendered: 0,
      uploaded: 0,
      skippedUploadReason: "Upload cooldown active.",
      warnings
    };
  }

  const now = DateTime.local();
  const nextWindow = await getNextWindowTime(now, rules);

  const needed = Math.max(0, rules.target_queue_size - draftCount);
  let planned = 0;
  if (needed > 0) {
    const planResult = await buildPlans(needed, { scheduledFor: nextWindow.toJSDate() });
    planned = planResult.createdIds.length;
    warnings.push(...planResult.warnings);
  }
  const renderResult = await renderPending(needed || effectiveCadence);
  const uploadResult = await uploadRendered(effectiveCadence, pendingCount, dailyUploads, rules);
  return {
    planned,
    rendered: renderResult.rendered,
    uploaded: uploadResult.uploaded,
    skippedUploadReason: uploadResult.skippedReason,
    warnings
  };
}

export async function runAutopilotCycle() {
  const rules = await getRulesSettings();
  const recovery = await getRecoveryStatus(rules);
  const postedCount = await prisma.postPlan.count({ where: { status: "POSTED" } });
  const rampCadence = postedCount < 6 ? 2 : rules.cadence_per_day;
  const effectiveCadence = recovery.active ? rules.recovery_mode.cadence_per_day : rampCadence;
  const draftCount = await getDraftCount();
  const pendingCount = await getPendingShareCount24h();
  const dailyUploads = await getDailyDraftUploadCount();

  if (!canUploadMore(pendingCount) || pendingCount >= 4 || draftCount >= rules.spam_guardrails.pending_drafts_cap) {
    await logRunEvent({
      runType: "pending_throttle",
      status: "WARN",
      payloadExcerpt: `pendingCount=${pendingCount},drafts=${draftCount}`
    });
    return;
  }

  if (await isCooldownActive()) {
    return;
  }

  await runMetricsRefresh();

  await promoteRetireArms({
    priorMean: rules.optimiser_policy.prior_mean,
    priorWeight: rules.optimiser_policy.prior_weight,
    minPullsBeforePromote: rules.optimiser_policy.min_pulls_before_promote,
    minPullsBeforeRetire: rules.optimiser_policy.min_pulls_before_retire,
    promotionMinImpressions: rules.optimiser_policy.promotion.min_impressions,
    promotionUplift: rules.optimiser_policy.promotion.uplift,
    retirementMinPulls: rules.optimiser_policy.retirement.max_underperform
  });

  const needed = Math.max(0, rules.target_queue_size - draftCount);
  if (needed > 0) {
    await buildPlans(needed, { scheduledFor: new Date() });
  }

  await renderPending(needed || effectiveCadence);
  await uploadRendered(effectiveCadence, pendingCount, dailyUploads, rules);
}
