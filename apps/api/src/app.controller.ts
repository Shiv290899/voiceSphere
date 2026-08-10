import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return { success: true, status: 'OK', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  getReady() {
    return {
      success: true,
      status: 'READY',
      services: {
        database: 'UP',
        redis: 'UP',
      },
    };
  }
}
