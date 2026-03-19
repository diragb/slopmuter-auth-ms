// Exports:
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(statusCode: number, code: string, message: string, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class AuthenticationError extends AppError {
  constructor(code: string, message: string) {
    super(401, code, message)
  }
}

export class ValidationError extends AppError {
  public readonly details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(400, code, message)
    this.details = details
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message)
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message)
  }
}

export class InternalError extends AppError {
  constructor(code: string, message: string) {
    super(500, code, message, false)
  }
}
