/**
 * VK Mini App launch parameters.
 *
 * When VK opens the Mini App it appends the signed launch params
 * (`vk_user_id`, `vk_app_id`, ... and `sign`) to the iframe URL query string.
 * The backend (`/api/vk/*`, see backend/src/services/vk-service.ts) re-verifies
 * the `sign` over the sorted `vk_*` params, so we must forward the ORIGINAL,
 * unmodified launch query string on every request.
 *
 * We capture it once on load (before react-router can touch the URL) and keep it.
 */

// Captured as early as possible — module is imported from main entry.
const initialSearch =
  typeof window !== 'undefined' ? window.location.search : '';

/**
 * The raw launch query string containing only `vk_*` params and `sign`,
 * e.g. "vk_user_id=123&vk_app_id=456&...&sign=abc".
 * Order is preserved as VK delivered it.
 */
export const vkLaunchQuery: string = (() => {
  const search = initialSearch.startsWith('?')
    ? initialSearch.slice(1)
    : initialSearch;

  if (!search) return '';

  const kept = search
    .split('&')
    .filter((pair) => {
      const key = pair.split('=')[0];
      return key.startsWith('vk_') || key === 'sign';
    });

  return kept.join('&');
})();

/** True when the app was actually opened from inside VK. */
export const isLaunchedFromVK: boolean = /(^|&)sign=/.test(vkLaunchQuery);

/** Convenience accessor for individual launch params. */
export const vkLaunchParams: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  if (!vkLaunchQuery) return out;
  for (const pair of vkLaunchQuery.split('&')) {
    const [k, v = ''] = pair.split('=');
    out[k] = decodeURIComponent(v);
  }
  return out;
})();

export const vkUserId: string | undefined = vkLaunchParams['vk_user_id'];
