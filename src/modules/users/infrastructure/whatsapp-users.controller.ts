import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ServiceApiKeyGuard } from '../../../shared/guards/service-api-key.guard';
import { FindOrCreateCustomerByPhoneUseCase } from '../application/find-or-create-customer-by-phone.use-case';
import { FindOrCreateCustomerByPhoneDto } from '../dto/find-or-create-customer-by-phone.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@ApiTags('whatsapp')
@ApiSecurity('service-api-key')
@UseGuards(ServiceApiKeyGuard)
@Controller('whatsapp/customers')
export class WhatsappUsersController {
  constructor(
    private readonly findOrCreateCustomerByPhoneUseCase: FindOrCreateCustomerByPhoneUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary:
      'Find or auto-create a CUSTOMER by phone number (WhatsApp chatbot, service API key only)',
  })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async findOrCreate(
    @Body() dto: FindOrCreateCustomerByPhoneDto,
  ): Promise<UserResponseDto> {
    const customer = await this.findOrCreateCustomerByPhoneUseCase.execute({
      phone: dto.phone,
      name: dto.name,
    });
    return new UserResponseDto(customer);
  }
}
