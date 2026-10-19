export class ApiError extends Error {
  status: number;
  details?: Array<{ field: string; message: string }>;

  constructor(message: string, status: number, details?: Array<{ field: string; message: string }>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function resolveUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE_URL}${url}`;
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(resolveUrl(url), {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Ensures express-session cookie is sent
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    let details: Array<{ field: string; message: string }> | undefined;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
      if (errorData.details) {
        details = errorData.details;
        const detailsStr = errorData.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
        errorMessage += ` (${detailsStr})`;
      }
    } catch {
      // Non-JSON response
    }
    throw new ApiError(errorMessage, response.status, details);
  }

  // If response is 204 No Content or empty
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export async function downloadFile(url: string, filename: string): Promise<void> {
  const response = await fetch(resolveUrl(url), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(a);
}
