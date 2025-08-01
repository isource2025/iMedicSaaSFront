/**
 * Versión de fetch con timeout para evitar esperas indefinidas
 */
export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  const response = await fetch(url, {
    ...options,
    signal: controller.signal,
  });
  
  clearTimeout(id);
  return response;
}
