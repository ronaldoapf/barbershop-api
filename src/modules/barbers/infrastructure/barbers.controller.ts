import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../shared/application/pagination-query.dto';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { UserRole } from '../../users/domain/user-role.enum';
import { GetBarberUseCase } from '../application/get-barber.use-case';
import { ListBarbersUseCase } from '../application/list-barbers.use-case';
import { UpdateCommissionUseCase } from '../application/update-commission.use-case';
import { BarberResponseDto } from '../dto/barber-response.dto';
import { UpdateCommissionDto } from '../dto/update-commission.dto';

@ApiTags('barbers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('barbers')
export class BarbersController {
  constructor(
    private readonly listBarbersUseCase: ListBarbersUseCase,
    private readonly getBarberUseCase: GetBarberUseCase,
    private readonly updateCommissionUseCase: UpdateCommissionUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active barbers' })
  @ApiResponse({ status: 200, type: BarberResponseDto, isArray: true })
  async list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<BarberResponseDto>> {
    const result = await this.listBarbersUseCase.execute(
      query.page,
      query.limit,
    );
    return {
      ...result,
      data: result.data.map((barber) => new BarberResponseDto(barber)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a barber by id' })
  @ApiResponse({ status: 200, type: BarberResponseDto })
  async getById(@Param('id') id: string): Promise<BarberResponseDto> {
    const barber = await this.getBarberUseCase.execute(id);
    return new BarberResponseDto(barber);
  }

  @Patch(':id/commission')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: "Update a barber's commission percentage" })
  @ApiResponse({ status: 200, type: BarberResponseDto })
  async updateCommission(
    @Param('id') id: string,
    @Body() dto: UpdateCommissionDto,
  ): Promise<BarberResponseDto> {
    const barber = await this.updateCommissionUseCase.execute(
      id,
      dto.commissionPercentage,
    );
    return new BarberResponseDto(barber);
  }
}
