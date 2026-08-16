import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { GetUserProfileUseCase } from '../application/get-user-profile.use-case';
import { UpdateUserProfileUseCase } from '../application/update-user-profile.use-case';
import { UserEntity } from '../domain/user.entity';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly getUserProfileUseCase: GetUserProfileUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getMe(@CurrentUser() user: UserEntity): Promise<UserResponseDto> {
    const profile = await this.getUserProfileUseCase.execute(user.id);
    return new UserResponseDto(profile);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the authenticated user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async updateMe(
    @CurrentUser() user: UserEntity,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const profile = await this.updateUserProfileUseCase.execute(user.id, dto);
    return new UserResponseDto(profile);
  }
}
