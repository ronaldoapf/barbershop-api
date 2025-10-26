export class AppError extends Error {
  public readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string) {
    super(message, 422)
  }
}

export class InternalServerError extends AppError {
  constructor(message: string) {
    super(message, 500)
  }
}
