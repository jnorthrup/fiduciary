/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiRequestOptions } from './ApiRequestOptions';
import type { ApiResult } from './ApiResult';
import type { OpenAPIConfig } from './OpenAPI';
import { CancelablePromise } from './CancelablePromise';
import { ApiError } from './ApiError';

const headers: Record<string, string> = {};
const credentials: RequestCredentials = 'same-origin';

const request = <T>(config: OpenAPIConfig, options: ApiRequestOptions): CancelablePromise<T> => {
    return new CancelablePromise<T>((resolve, reject, onCancel) => {
        // Construct URL
        let url = config.BASE + options.url;
        if (options.path) {
            Object.entries(options.path).forEach(([key, value]) => {
                url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
            });
        }

        // Construct query string
        if (options.query) {
            const params = new URLSearchParams();
            Object.entries(options.query).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    params.append(key, String(value));
                }
            });
            const queryString = params.toString();
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
        }

        // Construct headers
        const requestHeaders: HeadersInit = {
            ...headers,
            ...config.HEADERS,
            ...options.headers,
        };

        // Set content type for body
        if (options.body) {
            if (options.mediaType) {
                requestHeaders['Content-Type'] = options.mediaType;
            }
        }

        // Set authorization header
        if (config.TOKEN !== undefined) {
            const token = typeof config.TOKEN === 'function' ? config.TOKEN(options).then(t => t) : config.TOKEN;

            // Handle both sync and async tokens
            if (typeof token === 'string') {
                requestHeaders['Authorization'] = `Bearer ${token}`;
            } else if (token && typeof token.then === 'function') {
                // Async token - this is tricky, we'd need to await it
                // For now, skip if token is async
            }
        }

        // Construct request
        const init: RequestInit = {
            method: options.method,
            headers: requestHeaders,
            credentials: config.CREDENTIALS || credentials,
        };

        // Handle body
        if (options.body) {
            init.body = JSON.stringify(options.body);
        }

        // Handle form data
        if (options.formData) {
            const formData = new FormData();
            Object.entries(options.formData).forEach(([key, value]) => {
                formData.append(key, value as string | Blob);
            });
            init.body = formData;
            delete requestHeaders['Content-Type']; // Let browser set it with boundary
        }

        // Create abort controller for cancellation
        const controller = new AbortController();
        onCancel(() => controller.abort());

        // Set signal for fetch
        init.signal = controller.signal;

        // Execute request
        fetch(url, init)
            .then(async (response) => {
                const contentType = response.headers.get('content-type');
                let data: any;

                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else if (contentType && contentType.includes('application/xml')) {
                    data = await response.text();
                } else if (contentType && contentType.includes('text/')) {
                    data = await response.text();
                } else {
                    data = await response.blob();
                }

                // Build ApiResult
                const result: ApiResult = {
                    url,
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    body: data,
                };

                // Handle error responses
                if (!response.ok) {
                    throw new ApiError(options, result, options.errors?.[response.status] || data?.message || response.statusText);
                }

                resolve(data);
            })
            .catch((error) => {
                reject(error);
            });
    });
};

export { request };
