const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  /*
   * Get JWT token from browser localStorage.
   * localStorage is only available in the browser.
   */
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;

  /*
   * Build request headers.
   */
  const headers: HeadersInit = {
    /*
     * Only add Content-Type when sending a request body.
     */
    ...(options.body
      ? {
          'Content-Type': 'application/json',
        }
      : {}),

    /*
     * Automatically attach JWT token if available.
     */
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),

    /*
     * Allow custom headers to override defaults.
     */
    ...options.headers,
  };

  /*
   * Send request to NestJS API.
   */
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  /*
   * Check response content type before parsing JSON.
   */
  const contentType = response.headers.get('content-type');

  const data =
    contentType?.includes('application/json')
      ? await response.json()
      : null;

  /*
   * Handle API errors.
   */
  if (!response.ok) {
    let errorMessage = 'Something went wrong';

    if (data?.message) {
      errorMessage = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message;
    }

    /*
     * Optional handling for Unauthorized users.
     */
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }

    throw new Error(errorMessage);
  }

  /*
   * Return typed API response.
   */
  return data as T;
}