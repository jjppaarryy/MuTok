import { prisma } from "./prisma";
import { logRunEvent } from "./logs";
import { getDraftCount, getPendingShareCount24h, canUploadMore } from "./queue";
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
import { maybeTriggerMutations } from "./optimiserSignals";
import { getEnabledHookRecipes } from "./hookRecipes";
import { seedInspoItem } from "./inspoSeed";

const renderPending = async (limit: number) => {
  const renderPlans = await prisma.postPlan.findMany({
    where: { status: "PLANNED" },
    orderBy: { createdAt: "asc" },
    take: limit
  });

  for (const plan of renderPlans) {
    try {
      await renderPostPlan(plan.id);
    } catch (error) {
      await prisma.postPlan.update({
        where: { id: plan.id },
        data: { status: "FAILED" }
      });
    }
  }
};

const uploadRendered = async (limit: number, pendingCount: number) => {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return;

  const tiktokSettings = await getTikTokSettings();
  const client = createTikTokClient({
    accessToken,
    sandbox: tiktokSettings.sandbox
  });

  await client.getCreatorInfo();

  const maxUploads = pendingCount <= 1 ? 2 : 1;
  const uploadPlans = await prisma.postPlan.findMany({
    where: { status: "RENDERED" },
    orderBy: { createdAt: "asc" },
    take: Math.min(limit, maxUploads)
  });

  for (const plan of uploadPlans) {
    if (!plan.renderPath) {
      continue;
    }
    const fileStats = await stat(plan.renderPath);
    const exportDefaults = tiktokSettings.export_defaults;
    const initResponse = await client.initializeUpload({
      post_info: {
        title: plan.caption || exportDefaults.caption,
        privacy_level: exportDefaults.visibility,
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
    });
    const uploadUrl = (initResponse as any)?.data?.upload_url;
    if (!uploadUrl) {
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
        break;
      }
      throw error;
    }
    await prisma.postPlan.update({
      where: { id: plan.id },
      data: {
        status: "UPLOADED_DRAFT",
        tiktokPublishId: (initResponse as any)?.data?.publish_id ?? null
      }
    });
  }
};

export async function runScheduledCycle() {
  const rules = await getRulesSettings();
  const draftCount = await getDraftCount();
  const pendingCount = await getPendingShareCount24h();

  if (!canUploadMore(pendingCount) || pendingCount >= 4) {
    await logRunEvent({
      runType: "pending_throttle",
      status: "WARN",
      payloadExcerpt: `pendingCount=${pendingCount}`
    });
    return;
  }

  if (await isCooldownActive()) {
    return;
  }

  const now = DateTime.local();
  const [firstWindow, secondWindow] = rules.post_time_windows;
  const [h1, m1] = firstWindow.split(":").map(Number);
  const [h2, m2] = secondWindow.split(":").map(Number);
  const firstTime = now.set({ hour: h1, minute: m1 });
  const secondTime = now.set({ hour: h2, minute: m2 });
  const nextWindow = firstTime > now ? firstTime : secondTime;

  const needed = Math.max(0, rules.target_queue_size - draftCount);
  if (needed > 0) {
    await buildPlans(needed, { scheduledFor: nextWindow.toJSDate() });
  }
  await renderPending(needed || rules.cadence_per_day);
  await uploadRendered(rules.cadence_per_day, pendingCount);
}

export async function runAutopilotCycle() {
  const rules = await getRulesSettings();
  const draftCount = await getDraftCount();
  const pendingCount = await getPendingShareCount24h();

  if (!canUploadMore(pendingCount) || pendingCount >= 4) {
    await logRunEvent({
      runType: "pending_throttle",
      status: "WARN",
      payloadExcerpt: `pendingCount=${pendingCount}`
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

  const recipes = await getEnabledHookRecipes();
  await maybeTriggerMutations({
    recipes,
    allowedIntents: rules.viral_engine.allowed_cta_types,
    rules
  });

  if (rules.optimiser_policy.autopilot_inspo_enabled) {
    const lastSeed = await prisma.runLog.findFirst({
      where: { runType: "inspo_autoseed" },
      orderBy: { startedAt: "desc" }
    });
    const lastSeedAt = lastSeed?.startedAt;
    const days = rules.optimiser_policy.autopilot_inspo_days;
    const shouldSeed =
      !lastSeedAt ||
      DateTime.fromJSDate(lastSeedAt).plus({ days }).toMillis() < DateTime.now().toMillis();
    if (shouldSeed) {
      const items = await prisma.inspoItem.findMany({
        where: rules.optimiser_policy.autopilot_inspo_only_favorites ? { favorite: true } : {}
      });
      for (const item of items) {
        await seedInspoItem({ inspoId: item.id, mode: "patterns" });
      }
      await logRunEvent({
        runType: "inspo_autoseed",
        status: "OK",
        payloadExcerpt: `count=${items.length}`
      });
    }
  }

  const needed = Math.max(0, rules.target_queue_size - draftCount);
  if (needed > 0) {
    await buildPlans(needed, { scheduledFor: new Date() });
  }

  await renderPending(needed || rules.cadence_per_day);
  await uploadRendered(rules.cadence_per_day, pendingCount);
}
