import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { Roles } from '../../../shared/decorators/roles.decorator';
import { AppointmentOwnershipGuard } from '../../../shared/guards/appointment-ownership.guard';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { CancelAppointmentUseCase } from '../application/cancel-appointment.use-case';
import { CompleteAppointmentUseCase } from '../application/complete-appointment.use-case';
import { ConfirmAppointmentUseCase } from '../application/confirm-appointment.use-case';
import { CreateAppointmentUseCase } from '../application/create-appointment.use-case';
import { GetAppointmentUseCase } from '../application/get-appointment.use-case';
import { GetAvailableSlotsUseCase } from '../application/get-available-slots.use-case';
import { ListAppointmentsUseCase } from '../application/list-appointments.use-case';
import { MarkNoShowUseCase } from '../application/mark-no-show.use-case';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';
import { AvailableSlotResponseDto } from '../dto/available-slot-response.dto';
import { AvailableSlotsQueryDto } from '../dto/available-slots-query.dto';
import { CancelAppointmentDto } from '../dto/cancel-appointment.dto';
import { CompleteAppointmentDto } from '../dto/complete-appointment.dto';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from '../dto/list-appointments-query.dto';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly getAvailableSlotsUseCase: GetAvailableSlotsUseCase,
    private readonly getAppointmentUseCase: GetAppointmentUseCase,
    private readonly listAppointmentsUseCase: ListAppointmentsUseCase,
    private readonly confirmAppointmentUseCase: ConfirmAppointmentUseCase,
    private readonly cancelAppointmentUseCase: CancelAppointmentUseCase,
    private readonly markNoShowUseCase: MarkNoShowUseCase,
    private readonly completeAppointmentUseCase: CompleteAppointmentUseCase,
  ) {}

  @Post()
  // @Roles(UserRole.CUSTOMER, UserRole.BARBER, UserRole.OWNER)
  @ApiOperation({ summary: 'Book an appointment' })
  @ApiResponse({ status: 201, type: AppointmentResponseDto })
  async create(
    @CurrentUser() user: UserEntity,
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.createAppointmentUseCase.execute(user.id, {
      barberId: dto.barberId,
      serviceIds: dto.serviceIds,
      startsAt: new Date(dto.startsAt),
    });
    return new AppointmentResponseDto(appointment);
  }

  @Get('available-slots')
  @ApiOperation({
    summary: 'List dynamic available booking slots for a barber and date',
  })
  @ApiResponse({ status: 200, type: AvailableSlotResponseDto, isArray: true })
  async availableSlots(
    @Query() query: AvailableSlotsQueryDto,
  ): Promise<AvailableSlotResponseDto[]> {
    const slots = await this.getAvailableSlotsUseCase.execute({
      barberId: query.barberId,
      serviceIds: query.serviceIds,
      date: new Date(query.date),
    });
    return slots.map((slot) => new AvailableSlotResponseDto(slot));
  }

  @Get()
  @ApiOperation({ summary: 'List appointments (automatically scoped)' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto, isArray: true })
  async list(
    @CurrentUser() user: UserEntity,
    @Query() query: ListAppointmentsQueryDto,
  ): Promise<PaginatedResult<AppointmentResponseDto>> {
    const result = await this.listAppointmentsUseCase.execute(
      user,
      query.page,
      query.limit,
      query.status,
    );
    return {
      ...result,
      data: result.data.map(
        (appointment) => new AppointmentResponseDto(appointment),
      ),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an appointment by id (automatically scoped)' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async getById(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.getAppointmentUseCase.execute(user, id);
    return new AppointmentResponseDto(appointment);
  }

  @Patch(':id/confirm')
  @UseGuards(AppointmentOwnershipGuard)
  @ApiOperation({ summary: 'Confirm a pending appointment' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async confirm(@Param('id') id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.confirmAppointmentUseCase.execute(id);
    return new AppointmentResponseDto(appointment);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an appointment' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async cancel(
    @CurrentUser() user: UserEntity,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.cancelAppointmentUseCase.execute(
      user,
      id,
      dto.cancellationReason,
    );
    return new AppointmentResponseDto(appointment);
  }

  @Patch(':id/no-show')
  @UseGuards(AppointmentOwnershipGuard)
  @ApiOperation({ summary: 'Mark an appointment as a no-show' })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async markNoShow(@Param('id') id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.markNoShowUseCase.execute(id);
    return new AppointmentResponseDto(appointment);
  }

  @Patch(':id/complete')
  @UseGuards(AppointmentOwnershipGuard)
  @ApiOperation({
    summary: 'Complete an appointment, freezing commission and loyalty points',
  })
  @ApiResponse({ status: 200, type: AppointmentResponseDto })
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.completeAppointmentUseCase.execute(
      id,
      dto.items ?? [],
    );
    return new AppointmentResponseDto(appointment);
  }
}
