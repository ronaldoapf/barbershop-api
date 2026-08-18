import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { UserEntity } from '../../users/domain/user.entity';
import { GetAvailabilityWindowUseCase } from '../application/get-availability-window.use-case';
import { ListWorkingHoursUseCase } from '../application/list-working-hours.use-case';
import { SetDateExceptionUseCase } from '../application/set-date-exception.use-case';
import { SetDefaultScheduleUseCase } from '../application/set-default-schedule.use-case';
import { SetWeeklyHoursUseCase } from '../application/set-weekly-hours.use-case';
import { AvailabilityWindowResponseDto } from '../dto/availability-window-response.dto';
import { GetAvailabilityQueryDto } from '../dto/get-availability-query.dto';
import { SetDateExceptionDto } from '../dto/set-date-exception.dto';
import { SetDefaultScheduleDto } from '../dto/set-default-schedule.dto';
import { SetWeeklyHoursDto } from '../dto/set-weekly-hours.dto';
import { WorkingHoursResponseDto } from '../dto/working-hours-response.dto';

@ApiTags('working-hours')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('working-hours')
export class WorkingHoursController {
  constructor(
    private readonly setWeeklyHoursUseCase: SetWeeklyHoursUseCase,
    private readonly setDateExceptionUseCase: SetDateExceptionUseCase,
    private readonly setDefaultScheduleUseCase: SetDefaultScheduleUseCase,
    private readonly listWorkingHoursUseCase: ListWorkingHoursUseCase,
    private readonly getAvailabilityWindowUseCase: GetAvailabilityWindowUseCase,
  ) {}

  @Get(':barberId')
  @ApiOperation({ summary: "List a barber's working-hours configuration" })
  @ApiResponse({ status: 200, type: WorkingHoursResponseDto, isArray: true })
  async list(
    @CurrentUser() user: UserEntity,
    @Param('barberId') barberId: string,
  ): Promise<WorkingHoursResponseDto[]> {
    const entries = await this.listWorkingHoursUseCase.execute(user, barberId);
    return entries.map((entry) => new WorkingHoursResponseDto(entry));
  }

  @Get(':barberId/availability')
  @ApiOperation({
    summary: 'Resolve the effective working window for a barber on a date',
  })
  @ApiResponse({ status: 200, type: AvailabilityWindowResponseDto })
  async availability(
    @Param('barberId') barberId: string,
    @Query() query: GetAvailabilityQueryDto,
  ): Promise<AvailabilityWindowResponseDto> {
    const window = await this.getAvailabilityWindowUseCase.execute(
      barberId,
      new Date(query.date),
    );
    return new AvailabilityWindowResponseDto(window);
  }

  @Post(':barberId/default-schedule')
  @ApiOperation({
    summary:
      'Set up the recurring weekly schedule in one call (defaults to Monday-Friday working, weekend off)',
  })
  @ApiResponse({ status: 200, type: WorkingHoursResponseDto, isArray: true })
  async setDefaultSchedule(
    @CurrentUser() user: UserEntity,
    @Param('barberId') barberId: string,
    @Body() dto: SetDefaultScheduleDto,
  ): Promise<WorkingHoursResponseDto[]> {
    const entries = await this.setDefaultScheduleUseCase.execute(
      user,
      barberId,
      dto,
    );
    return entries.map((entry) => new WorkingHoursResponseDto(entry));
  }

  @Put(':barberId/weekly/:dayOfWeek')
  @ApiOperation({ summary: "Set a barber's recurring hours for a weekday" })
  @ApiResponse({ status: 200, type: WorkingHoursResponseDto })
  async setWeeklyHours(
    @CurrentUser() user: UserEntity,
    @Param('barberId') barberId: string,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
    @Body() dto: SetWeeklyHoursDto,
  ): Promise<WorkingHoursResponseDto> {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new BadRequestException(
        'dayOfWeek must be between 0 (Sunday) and 6 (Saturday).',
      );
    }

    const entry = await this.setWeeklyHoursUseCase.execute(
      user,
      barberId,
      dayOfWeek,
      dto,
    );
    return new WorkingHoursResponseDto(entry);
  }

  @Post(':barberId/exceptions')
  @ApiOperation({
    summary: 'Set a one-off exception (day off or special hours) for a date',
  })
  @ApiResponse({ status: 200, type: WorkingHoursResponseDto })
  async setDateException(
    @CurrentUser() user: UserEntity,
    @Param('barberId') barberId: string,
    @Body() dto: SetDateExceptionDto,
  ): Promise<WorkingHoursResponseDto> {
    const entry = await this.setDateExceptionUseCase.execute(
      user,
      barberId,
      new Date(dto.date),
      dto,
    );
    return new WorkingHoursResponseDto(entry);
  }
}
