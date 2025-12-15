import { Response } from 'express';
import { ServiceResponse } from '../types';

export class HttpResponse {
  static success(res: Response, data: any, message?: string, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      ...(message && { message }),
      data,
    });
  }

  static error(res: Response, message: string, statusCode: number = 500, error?: any): void {
    res.status(statusCode).json({
      success: false,
      message,
      ...(error && { error }),
    });
  }

  static fromServiceResponse<T>(res: Response, serviceResponse: ServiceResponse<T>): void {
    if (serviceResponse.success) {
      this.success(res, serviceResponse.data, undefined, serviceResponse.status || 200);
    } else {
      this.error(
        res,
        serviceResponse.message || 'Error en el servicio',
        serviceResponse.status || 500,
        serviceResponse.error
      );
    }
  }
}

