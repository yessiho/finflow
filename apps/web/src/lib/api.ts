const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001';

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  /*
   * ==========================================
   * GET JWT TOKEN
   *
   * localStorage is only available
   * in the browser.
   * ==========================================
   */
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;

  /*
   * ==========================================
   * BUILD REQUEST HEADERS
   * ==========================================
   */
  const headers: HeadersInit = {
    /*
     * Only add Content-Type when
     * sending a request body.
     */
    ...(options.body
      ? {
          'Content-Type': 'application/json',
        }
      : {}),

    /*
     * Automatically attach JWT token
     * when available.
     */
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),

    /*
     * Allow custom headers to override
     * the default headers.
     */
    ...options.headers,
  };

  /*
   * ==========================================
   * SEND REQUEST TO BACKEND API
   * ==========================================
   */
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    },
  );

  /*
   * ==========================================
   * PARSE RESPONSE
   * ==========================================
   */
  const contentType =
    response.headers.get('content-type');

  const data =
    contentType?.includes('application/json')
      ? await response.json()
      : null;

  /*
   * ==========================================
   * HANDLE API ERRORS
   * ==========================================
   */
  if (!response.ok) {
    let errorMessage =
      'Something went wrong';

    if (data?.message) {
      errorMessage = Array.isArray(
        data.message,
      )
        ? data.message.join(', ')
        : data.message;
    }

    /*
     * Remove invalid/expired session.
     */
    if (
      response.status === 401 &&
      typeof window !== 'undefined'
    ) {
      localStorage.removeItem(
        'access_token',
      );

      localStorage.removeItem('user');
    }

    throw new Error(errorMessage);
  }

  /*
   * ==========================================
   * RETURN API RESPONSE
   * ==========================================
   */
  return data as T;
}