export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message, details: error.details }
    };
  }

  return {
    status: 500,
    body: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' }
  };
}
