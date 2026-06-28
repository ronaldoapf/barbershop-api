import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { UserRole } from '../domain/user-role.enum';
import { GetMeUseCase } from '../application/get-me.use-case';
import { UpdateMeUseCase } from '../application/update-me.use-case';
import { ListUsersUseCase } from '../application/list-users.use-case';
import { CreateBarberUseCase } from '../application/create-barber.use-case';
import { GetBarberUseCase } from '../application/get-barber.use-case';
import { ListBarbersUseCase } from '../application/list-barbers.use-case';
import { UpdateBarberUseCase } from '../application/update-barber.use-case';
import { DeleteBarberUseCase } from '../application/delete-barber.use-case';
import { PresignAvatarUseCase } from '../application/presign-avatar.use-case';
import { ConfirmAvatarUseCase } from '../application/confirm-avatar.use-case';
import { UpdateMeDto } from '../dto/update-me.dto';
import { CreateBarberDto } from '../dto/create-barber.dto';
import { UpdateBarberDto } from '../dto/update-barber.dto';
import { ConfirmAvatarDto } from '../dto/confirm-avatar.dto';
import { UserResponseDto, toUserResponseDto } from '../dto/user-response.dto';
import { BarberResponseDto, toBarberResponseDto } from '../dto/barber-response.dto';
import { PresignAvatarResponseDto } from '../dto/presign-avatar-response.dto';
import { PaginationQueryDto } from '../../../shared/application/pagination-query.dto';
import { PaginatedResult } from '../../../shared/domain/pagination.interface';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly createBarberUseCase: CreateBarberUseCase,
    private readonly getBarberUseCase: GetBarberUseCase,
    private readonly listBarbersUseCase: ListBarbersUseCase,
    private readonly updateBarberUseCase: UpdateBarberUseCase,
    private readonly deleteBarberUseCase: DeleteBarberUseCase,
    private readonly presignAvatarUseCase: PresignAvatarUseCase,
    private readonly confirmAvatarUseCase: ConfirmAvatarUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getMe(@CurrentUser() user: { id: string }): Promise<UserResponseDto> {
    return toUserResponseDto(await this.getMeUseCase.execute(user.id));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateMeDto): Promise<UserResponseDto> {
    return toUserResponseDto(await this.updateMeUseCase.execute(user.id, dto));
  }

  @Post('me/avatar/presign')
  @ApiOperation({ summary: 'Get presigned URL for avatar upload' })
  @ApiResponse({ status: 201, type: PresignAvatarResponseDto })
  async presignAvatar(
    @CurrentUser() user: { id: string },
    @Body('mimeType') mimeType: string,
  ): Promise<PresignAvatarResponseDto> {
    return this.presignAvatarUseCase.execute(user.id, mimeType);
  }

  @Patch('me/avatar/confirm')
  @ApiOperation({ summary: 'Confirm avatar after S3 upload' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async confirmAvatar(@CurrentUser() user: { id: string }, @Body() dto: ConfirmAvatarDto): Promise<UserResponseDto> {
    return toUserResponseDto(await this.confirmAvatarUseCase.execute(user.id, dto.storageKey));
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200 })
  async listUsers(@Query() query: PaginationQueryDto & { role?: UserRole }): Promise<PaginatedResult<UserResponseDto>> {
    const result = await this.listUsersUseCase.execute({ role: query.role, page: query.page, limit: query.limit });
    return { ...result, data: result.data.map(toUserResponseDto) };
  }

  @Post('barbers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a barber account' })
  @ApiResponse({ status: 201, type: BarberResponseDto })
  async createBarber(@Body() dto: CreateBarberDto): Promise<BarberResponseDto> {
    return toBarberResponseDto(await this.createBarberUseCase.execute(dto));
  }

  @Get('barbers')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'List barbers' })
  @ApiResponse({ status: 200 })
  async listBarbers(@Query() query: PaginationQueryDto): Promise<PaginatedResult<BarberResponseDto>> {
    const result = await this.listBarbersUseCase.execute({ page: query.page, limit: query.limit });
    return { ...result, data: result.data.map(toBarberResponseDto) };
  }

  @Get('barbers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get barber by id' })
  @ApiResponse({ status: 200, type: BarberResponseDto })
  async getBarber(@Param('id') id: string): Promise<BarberResponseDto> {
    return toBarberResponseDto(await this.getBarberUseCase.execute(id));
  }

  @Patch('barbers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update barber' })
  @ApiResponse({ status: 200, type: BarberResponseDto })
  async updateBarber(@Param('id') id: string, @Body() dto: UpdateBarberDto): Promise<BarberResponseDto> {
    return toBarberResponseDto(await this.updateBarberUseCase.execute(id, dto));
  }

  @Delete('barbers/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Soft-delete a barber' })
  @ApiResponse({ status: 200 })
  async deleteBarber(@Param('id') id: string): Promise<void> {
    await this.deleteBarberUseCase.execute(id);
  }
}
