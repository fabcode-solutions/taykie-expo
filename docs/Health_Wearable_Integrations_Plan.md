# Health & Wearable Integrations Plan

This covers the integrations currently stubbed as toggles in [app/settings/integrations.tsx](../app/settings/integrations.tsx) (Apple Health, Google Fit) plus the additional wearables discussed: Fitbit, Garmin, Galaxy Watch, and Oura Ring.

Current state: the settings screen only flips a boolean in `notificationSettings.integrations` (see `stores/notificationStore.ts`). No SDK, OAuth flow, or data storage exists yet for any of these — this document is the plan for building that.

## Two fundamentally different integration styles

| Style | Providers | How auth works | Where data lives |
|---|---|---|---|
| **On-device SDK** | Apple Health, Android Health Connect | Native permission prompt, no backend auth | Stays on-device unless the app explicitly uploads it |
| **Cloud OAuth API** | Fitbit, Garmin, Oura | User authorizes once via OAuth2 in-app; backend holds the tokens | Backend polls/receives the provider's servers; we store what we pull |

Galaxy Watch has no public third-party API of its own — its data reaches us only if the user's Samsung Health app syncs into Android Health Connect, so it's covered by the Health Connect integration, not a separate one.

---

## 1. Apple Health (iOS)

**How**: Use `react-native-health` (wraps HealthKit). Requires a custom dev client build (not Expo Go) — add the HealthKit entitlement + `NSHealthShareUsageDescription`/`NSHealthUpdateUsageDescription` in `app.config.ts` via a config plugin (the repo already has a `plugins/` folder for this pattern), then rebuild via EAS. Request only the specific `HKQuantityType`/`HKCategoryType` permissions we need (e.g. steps, sleep) rather than blanket access — Apple's review process scrutinizes over-broad HealthKit requests.

**Purpose**: Read the user's existing health data (steps, sleep, heart rate) without asking them to re-enter anything, and optionally write medication-adherence events back into Health's "Medications" log so it shows up alongside their other health records.

**What we'd use it for**: Correlate the data with dosage adherence (e.g. "missed doses more common on low-sleep days"), and/or suppress a reminder if the data suggests the user is asleep.

---

## 2. Google Fit / Android Health Connect

**How**: Google has deprecated the legacy Google Fit API — **build against `react-native-health-connect` (Android Health Connect), not Google Fit**, even though the existing toggle is still labeled "Google Fit." Same custom-dev-client requirement as HealthKit; Health Connect permissions are declared in the Android manifest via a config plugin and requested at runtime.

**Purpose**: Same as Apple Health, but for Android — steps/sleep/heart-rate read access, with the option to write adherence data back.

**What we'd use it for**: Same as above — this is the Android-side mirror of the Apple Health integration, and also the path through which Galaxy Watch data reaches us (see below).

---

## 3. Galaxy Watch (via Samsung Health → Health Connect)

**How**: No direct integration — Samsung doesn't offer a public third-party API for Galaxy Watch/Samsung Health. Samsung Health itself can sync into Android Health Connect, so once the Health Connect integration (above) is built, a Galaxy Watch user's data flows in automatically as long as they've enabled that sync in Samsung Health.

**Purpose**: Extend wearable coverage to Samsung/Galaxy Watch users without a separate integration to build or maintain.

**What we'd use it for**: Same use cases as Health Connect — no additional work beyond what's already listed there.

---

## 4. Fitbit

**How**: Fitbit Web API — OAuth2 authorization code flow. User taps "Connect Fitbit" in-app, is sent through Fitbit's OAuth consent screen, and the backend stores the resulting access/refresh token pair. Backend then either polls Fitbit's REST API on a schedule or (preferred, lower rate-limit pressure) registers for Fitbit's subscription/webhook notifications so it's told when new data is available.

**Purpose**: Bring in activity, sleep, and heart-rate data for users who track with a Fitbit device instead of (or alongside) their phone.

**What we'd use it for**: Same correlation/adherence-context use cases as the on-device integrations, but sourced from the backend rather than the device.

---

## 5. Garmin

**How**: Garmin Connect Health API — also OAuth2, but Garmin gates API access behind a partner application/approval process (not fully self-serve like Fitbit/Oura). Plan for lead time to get approved before any code can be tested end-to-end. Once approved, the integration shape mirrors Fitbit: OAuth connect flow, backend-held tokens, webhook-based data pull ("Ping" service) rather than polling.

**Purpose**: Cover Garmin's user base (skews toward more serious fitness/health tracking) with the same activity/sleep/heart-rate data.

**What we'd use it for**: Same as Fitbit.

---

## 6. Oura Ring

**How**: Oura's Cloud API v2 — OAuth2, fully self-serve and well-documented, the easiest of the cloud providers to stand up. Same shape as Fitbit: connect flow, token storage, scheduled pull or webhook.

**Purpose**: Oura specializes in sleep and readiness/recovery scoring, which is a strong complement to a medication-adherence app — sleep quality is one of the more directly actionable signals for reminder timing.

**What we'd use it for**: Sleep-aware reminder logic (e.g. don't fire a loud reminder during a detected sleep window) and adherence-vs-sleep-quality correlation in reporting.

---

## Data model needed (cloud-API providers only)

Two new backend tables (on-device sources don't need the first one):

1. **`health_integration_connections`** — `user_id`, `provider` (`fitbit` / `garmin` / `oura`), `access_token`, `refresh_token`, `scopes`, `expires_at`, `connected_at`. One row per user per provider.
2. **`health_metrics`** — `user_id`, `provider`, `metric_type` (`steps` / `sleep` / `heart_rate` / ...), `value`, `unit`, `recorded_at`, `source`. Time-series data — at 2-4M users this needs partitioning/retention planning, not just another table on the primary relational DB.

## Open decision before building any of this

Which of the three "what will we use it for" outcomes is the actual product goal:
1. A dashboard showing activity/sleep/heart-rate alongside adherence history.
2. Smarter reminder timing (e.g. suppress/delay a reminder during a detected sleep window).
3. Writing adherence data *back* into Apple Health / Health Connect so it appears in the user's own health record.

The answer determines which providers to prioritize first (Oura and Apple Health/Health Connect are the fastest to ship; Garmin has the longest lead time) and how much of the read vs. write permission surface we actually need to request.
