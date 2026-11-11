import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express'
import multer from 'multer'
import { ZodError, type ZodType } from 'zod'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next)
  }
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ApiError(422, 'The submitted data is invalid.', fieldErrors(parsed.error))
  }
  return parsed.data
}

function fieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'request')
    fields[key] ??= []
    fields[key].push(issue.message)
  }
  return fields
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.status).json({
      message: error.message,
      ...(error.errors ? { errors: error.errors } : {}),
    })
    return
  }

  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 422
    response.status(status).json({ message: status === 413 ? 'The image must be 5 MB or smaller.' : error.message })
    return
  }

  if (error instanceof ZodError) {
    response.status(422).json({ message: 'The submitted data is invalid.', errors: fieldErrors(error) })
    return
  }

  const postgresError = error as { code?: string }
  if (postgresError.code === '23505') {
    response.status(409).json({ message: 'An account with that email already exists.', errors: { email: ['This email is already in use.'] } })
    return
  }

  if (error instanceof Error && error.message.startsWith('CORS:')) {
    response.status(403).json({ message: 'This origin is not allowed to access the API.' })
    return
  }

  const httpError = error as { status?: number }
  if (httpError.status === 404) {
    response.status(404).json({ message: 'The requested resource was not found.' })
    return
  }

  if (error instanceof Error) {
    console.error('API request failed:', error.message)
  } else {
    console.error('API request failed with an unknown error.')
  }
  response.status(500).json({ message: 'An unexpected server error occurred.' })
}
