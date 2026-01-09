/**
 * Wait for a specific font to be loaded using the FontFaceSet API
 * @param fontFamily - The font family name to wait for
 * @param timeout - Maximum time to wait in milliseconds (default 3000ms)
 * @returns Promise that resolves to true if font loaded, false if timeout or error
 */
export async function waitForFont(
  fontFamily: string,
  timeout: number = 3000
): Promise<boolean> {
  if (typeof document === 'undefined') return true;

  // Skip waiting for generic font families
  if (['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'].includes(fontFamily)) {
    return true;
  }

  try {
    await Promise.race([
      document.fonts.load(`16px "${fontFamily}"`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Font load timeout')), timeout)
      )
    ]);
    return true;
  } catch {
    console.warn(`[FontLoader] Font "${fontFamily}" failed to load within ${timeout}ms, using fallback`);
    return false;
  }
}
