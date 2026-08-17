import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { ServiceResponseDto } from '../../services/dto/service-response.dto';
import { UserRole } from '../../users/domain/user-role.enum';
import { AssignServiceToBarberUseCase } from '../application/assign-service-to-barber.use-case';
import { ListBarberServicesUseCase } from '../application/list-barber-services.use-case';
import { UnassignServiceFromBarberUseCase } from '../application/unassign-service-from-barber.use-case';
import { AssignServiceDto } from '../dto/assign-service.dto';

@ApiTags('barber-services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('barbers/:barberId/services')
export class BarberServicesController {
  constructor(
    private readonly assignServiceToBarberUseCase: AssignServiceToBarberUseCase,
    private readonly unassignServiceFromBarberUseCase: UnassignServiceFromBarberUseCase,
    private readonly listBarberServicesUseCase: ListBarberServicesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the services a barber is assigned to perform',
  })
  @ApiResponse({ status: 200, type: ServiceResponseDto, isArray: true })
  async list(
    @Param('barberId') barberId: string,
  ): Promise<ServiceResponseDto[]> {
    const services = await this.listBarberServicesUseCase.execute(barberId);
    return services.map((service) => new ServiceResponseDto(service));
  }

  @Post()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Assign a service to a barber' })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  async assign(
    @Param('barberId') barberId: string,
    @Body() dto: AssignServiceDto,
  ): Promise<ServiceResponseDto> {
    const service = await this.assignServiceToBarberUseCase.execute(
      barberId,
      dto.serviceId,
    );
    return new ServiceResponseDto(service);
  }

  @Delete(':serviceId')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unassign a service from a barber' })
  @ApiResponse({ status: 204 })
  async unassign(
    @Param('barberId') barberId: string,
    @Param('serviceId') serviceId: string,
  ): Promise<void> {
    await this.unassignServiceFromBarberUseCase.execute(barberId, serviceId);
  }
}
