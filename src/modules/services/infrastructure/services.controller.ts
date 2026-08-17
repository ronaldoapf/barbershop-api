import {
  Body,
  Controller,
  Delete,
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
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { UserEntity } from '../../users/domain/user.entity';
import { UserRole } from '../../users/domain/user-role.enum';
import { CreateServiceUseCase } from '../application/create-service.use-case';
import { DeactivateServiceUseCase } from '../application/deactivate-service.use-case';
import { ListServicesUseCase } from '../application/list-services.use-case';
import { UpdateServiceUseCase } from '../application/update-service.use-case';
import { CreateServiceDto } from '../dto/create-service.dto';
import { ListServicesQueryDto } from '../dto/list-services-query.dto';
import { ServiceResponseDto } from '../dto/service-response.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ServicesController {
  constructor(
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly listServicesUseCase: ListServicesUseCase,
    private readonly deactivateServiceUseCase: DeactivateServiceUseCase,
  ) {}

  @Post()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new service' })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  async create(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    const service = await this.createServiceUseCase.execute(dto);
    return new ServiceResponseDto(service);
  }

  @Get()
  @ApiOperation({ summary: 'List services' })
  @ApiResponse({ status: 200, type: ServiceResponseDto, isArray: true })
  async list(
    @CurrentUser() user: UserEntity,
    @Query() query: ListServicesQueryDto,
  ): Promise<PaginatedResult<ServiceResponseDto>> {
    const result = await this.listServicesUseCase.execute(
      user.role,
      query.page,
      query.limit,
      query.status,
    );
    return {
      ...result,
      data: result.data.map((service) => new ServiceResponseDto(service)),
    };
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update a service' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const service = await this.updateServiceUseCase.execute(id, dto);
    return new ServiceResponseDto(service);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Deactivate a service (sets status to INACTIVE)' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async deactivate(@Param('id') id: string): Promise<ServiceResponseDto> {
    const service = await this.deactivateServiceUseCase.execute(id);
    return new ServiceResponseDto(service);
  }
}
