export class BaseError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errorCode?: string
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor)
  }
}

export class URLProcessingError extends BaseError {
  constructor(message: string, code: 'INVALID_FORMAT' | 'ENCODING_ERROR' | 'UNREACHABLE') {
    super(message, 400, `URL_${code}`);
    this.name = 'URLProcessingError';
  }
}

export class HTMLParsingError extends BaseError {
  constructor(message: string, code: 'FETCH_FAILED' | 'INVALID_STRUCTURE' | 'TIMEOUT') {
    const statusCode =
      code === 'FETCH_FAILED' ? 502 :
        code === 'TIMEOUT' ? 504 :
          422;  // INVALID_STRUCTURE
    super(message, statusCode, `URL_${code}`);
    this.name = 'HTMLParsingError';
  }
}

export class FeedError extends BaseError {
  constructor(message: string, code: 'INVALID_STRUCTURE' | 'DATE_PARSING' | 'XML_GENERATION') {
    super(message, 422, `FEED_${code}`);
    this.name = 'FeedError';
  }
}

export class APIError extends BaseError {
  constructor(message: string, code: 'TIMEOUT' | 'RATE_LIMIT' | 'INVALID_RESPONSE' | 'AUTH_ERROR') {
    const statusCode =
      code === 'TIMEOUT' ? 504 :
        code === 'RATE_LIMIT' ? 429 :
          code === 'AUTH_ERROR' ? 503 :
            502; // INVALID_RESPONSE

    super(message, statusCode, `API_${code}`);
    this.name = 'APIError';
  }
}
