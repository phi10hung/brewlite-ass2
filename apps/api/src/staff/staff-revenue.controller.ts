import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { StaffGuard } from '../auth/staff.guard.js';
import { StaffRevenueService } from './staff-revenue.service.js';

// Chỉ Nhân viên gọi được; khách gọi trả 403 (FR-23, NFR-05)
@Controller('staff/revenue')
@UseGuards(JwtAuthGuard, StaffGuard)
export class StaffRevenueController {
  constructor(private readonly revenue: StaffRevenueService) {}

  @Get()
  summary() {
    return this.revenue.summary();
  }
}
