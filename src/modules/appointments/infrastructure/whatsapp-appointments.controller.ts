import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ServiceApiKeyGuard } from '../../../shared/guards/service-api-key.guard';
import { CreateAppointmentUseCase } from '../application/create-appointment.use-case';
import { GetAvailableSlotsUseCase } from '../application/get-available-slots.use-case';
import { AppointmentResponseDto } from '../dto/appointment-response.dto';
import { AvailableSlotResponseDto } from '../dto/available-slot-response.dto';
import { AvailableSlotsQueryDto } from '../dto/available-slots-query.dto';
import { CreateWhatsappAppointmentDto } from '../dto/create-whatsapp-appointment.dto';
import { AppointmentSource } from '../domain/appointment-source.enum';

@ApiTags('whatsapp')
@ApiSecurity('service-api-key')
@UseGuards(ServiceApiKeyGuard)
@Controller('whatsapp')
export class WhatsappAppointmentsController {
  constructor(
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly getAvailableSlotsUseCase: GetAvailableSlotsUseCase,
  ) {}

  @Post('appointments')
  @ApiOperation({
    summary: 'Book an appointment on behalf of a WhatsApp customer',
  })
  @ApiResponse({ status: 201, type: AppointmentResponseDto })
  async create(
    @Body() dto: CreateWhatsappAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.createAppointmentUseCase.execute(
      dto.customerId,
      {
        barberId: dto.barberId,
        serviceIds: dto.serviceIds,
        startsAt: new Date(dto.startsAt),
        source: AppointmentSource.WHATSAPP,
      },
    );
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
}
