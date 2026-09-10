# Performance Optimization Plan

Target: keep the app fast and responsive at scale (2-4M+ users). Findings below are based on a scan of the current codebase (Expo SDK 53, React Native 0.79.6, Zustand 5).

## Priority 1 — High impact, low risk

### 1. Migrate `FlatList` → `@shopify/flash-list`
- Current: 24 files use `FlatList`, 0 use `FlashList`.
- Why: FlashList recycles list items instead of mounting/unmounting them, which cuts scroll jank and memory usage significantly on long feeds (posts, comments, groups, schedule lists).
- Risk: low — mostly a drop-in API change, needs `estimatedItemSize` tuning per list.

### 2. Standardize on `expo-image`
- Current: 12 files import `Image` from `react-native`, only 3 use `expo-image`.
- Why: `expo-image` provides disk + memory caching, faster decoding, and blurhash/placeholder support out of the box — a big win for image-heavy screens (feed, profile, product lists).
- Risk: low — API is close to RN's `Image`.

### 3. Expand `react-native-mmkv` usage
- Current: only 1 file uses MMKV; the rest likely rely on `AsyncStorage`.
- Why: MMKV is synchronous and roughly 10-30x faster than AsyncStorage for reads/writes — matters for hot paths like auth tokens, schedule cache, and user preferences.
- Risk: low-medium — needs a migration path for existing AsyncStorage keys.

## Priority 2 — Medium impact

### 4. Tune `@tanstack/react-query` caching
- Current: used in 8 files; unclear if all network reads go through it.
- Actions:
  - Set deliberate `staleTime` / `gcTime` per query instead of relying on defaults, so screens don't refetch unnecessarily on focus.
  - Route all remaining raw fetch/axios calls through react-query so caching, retries, and dedupe are consistent app-wide.

### 5. Zustand selector hygiene
- Action: audit `bleStore` and `scheduleStore` usages — subscribe with narrow selectors (`useStore(s => s.x)`) instead of destructuring the whole store, to avoid unnecessary re-renders across screens that hold a lot of state.

## Priority 3 — Infrastructure / backend

### 6. Server-side and network-level wins
- CDN in front of images and static assets.
- gzip/brotli compression on API responses.
- Proper pagination/cursor-based loading on list endpoints (posts, comments, groups, notifications).
- These matter as much as client-side changes once the user base is in the millions.

## Suggested rollout order
1. FlashList migration on the largest/most-used lists first (feed, comments).
2. expo-image swap (mechanical, can be done incrementally per screen).
3. MMKV migration for auth/session and schedule cache.
4. react-query audit — staleTime/gcTime tuning + coverage expansion.
5. Zustand selector cleanup.
6. Backend/CDN/pagination review (coordinate with backend team).

Each step is independently shippable and reversible — no need to do them all at once.
