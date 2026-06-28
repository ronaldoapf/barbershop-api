import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../shared/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { UserRole } from '../../users/domain/user-role.enum';
import { PaginationQueryDto } from '../../../shared/application/pagination-query.dto';
import { ListServicesQueryDto } from '../dto/list-services-query.dto';
import { CreateCategoryUseCase } from '../application/create-category.use-case';
import { UpdateCategoryUseCase } from '../application/update-category.use-case';
import { DeleteCategoryUseCase } from '../application/delete-category.use-case';
import { ListCategoriesUseCase } from '../application/list-categories.use-case';
import { CreateServiceUseCase } from '../application/create-service.use-case';
import { UpdateServiceUseCase } from '../application/update-service.use-case';
import { DeleteServiceUseCase } from '../application/delete-service.use-case';
import { ListServicesUseCase } from '../application/list-services.use-case';
import { ToggleServiceStatusUseCase } from '../application/toggle-service-status.use-case';
import { CreatePackageUseCase } from '../application/create-package.use-case';
import { UpdatePackageUseCase } from '../application/update-package.use-case';
import { DeletePackageUseCase } from '../application/delete-package.use-case';
import { ListPackagesUseCase } from '../application/list-packages.use-case';
import { TogglePackageStatusUseCase } from '../application/toggle-package-status.use-case';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CreateServiceDto } from '../dto/create-service.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { CreatePackageDto } from '../dto/create-package.dto';
import { UpdatePackageDto } from '../dto/update-package.dto';
import { CategoryResponseDto, toCategoryResponseDto } from '../dto/category-response.dto';
import { ServiceResponseDto, toServiceResponseDto } from '../dto/service-response.dto';
import { PackageResponseDto, toPackageResponseDto } from '../dto/package-response.dto';
import { ItemStatus } from '../domain/item-status.enum';

@ApiTags('catalog')
@Controller()
export class ServicesController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly deleteServiceUseCase: DeleteServiceUseCase,
    private readonly listServicesUseCase: ListServicesUseCase,
    private readonly toggleServiceStatusUseCase: ToggleServiceStatusUseCase,
    private readonly createPackageUseCase: CreatePackageUseCase,
    private readonly updatePackageUseCase: UpdatePackageUseCase,
    private readonly deletePackageUseCase: DeletePackageUseCase,
    private readonly listPackagesUseCase: ListPackagesUseCase,
    private readonly togglePackageStatusUseCase: TogglePackageStatusUseCase,
  ) {}

  // --- Categories ---
  @Get('categories')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List all categories' })
  @ApiResponse({ status: 200, type: [CategoryResponseDto] })
  async listCategories(): Promise<CategoryResponseDto[]> {
    return (await this.listCategoriesUseCase.execute()).map(toCategoryResponseDto);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category' })
  @ApiResponse({ status: 201, type: CategoryResponseDto })
  async createCategory(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return toCategoryResponseDto(await this.createCategoryUseCase.execute(dto));
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, type: CategoryResponseDto })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    return toCategoryResponseDto(await this.updateCategoryUseCase.execute(id, dto));
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete category' })
  @ApiResponse({ status: 200 })
  async deleteCategory(@Param('id') id: string): Promise<void> {
    await this.deleteCategoryUseCase.execute(id);
  }

  // --- Services ---
  @Get('services')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List services' })
  @ApiResponse({ status: 200 })
  async listServices(@Query() query: ListServicesQueryDto) {
    const result = await this.listServicesUseCase.execute({ categoryId: query.categoryId, status: query.status, page: query.page, limit: query.limit });
    return { ...result, data: result.data.map(toServiceResponseDto) };
  }

  @Post('services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create service' })
  @ApiResponse({ status: 201, type: ServiceResponseDto })
  async createService(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.createServiceUseCase.execute(dto));
  }

  @Patch('services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update service' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.updateServiceUseCase.execute(id, dto));
  }

  @Patch('services/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle service ACTIVE/INACTIVE' })
  @ApiResponse({ status: 200, type: ServiceResponseDto })
  async toggleServiceStatus(@Param('id') id: string): Promise<ServiceResponseDto> {
    return toServiceResponseDto(await this.toggleServiceStatusUseCase.execute(id));
  }

  @Delete('services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete service' })
  @ApiResponse({ status: 200 })
  async deleteService(@Param('id') id: string): Promise<void> {
    await this.deleteServiceUseCase.execute(id);
  }

  // --- Packages ---
  @Get('packages')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'List packages' })
  @ApiResponse({ status: 200 })
  async listPackages(@Query() query: PaginationQueryDto) {
    const result = await this.listPackagesUseCase.execute({ page: query.page, limit: query.limit });
    return { ...result, data: result.data.map(toPackageResponseDto) };
  }

  @Post('packages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create package' })
  @ApiResponse({ status: 201, type: PackageResponseDto })
  async createPackage(@Body() dto: CreatePackageDto): Promise<PackageResponseDto> {
    return toPackageResponseDto(await this.createPackageUseCase.execute(dto));
  }

  @Patch('packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update package' })
  @ApiResponse({ status: 200, type: PackageResponseDto })
  async updatePackage(@Param('id') id: string, @Body() dto: UpdatePackageDto): Promise<PackageResponseDto> {
    return toPackageResponseDto(await this.updatePackageUseCase.execute(id, dto));
  }

  @Patch('packages/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle package ACTIVE/INACTIVE' })
  @ApiResponse({ status: 200, type: PackageResponseDto })
  async togglePackageStatus(@Param('id') id: string): Promise<PackageResponseDto> {
    return toPackageResponseDto(await this.togglePackageStatusUseCase.execute(id));
  }

  @Delete('packages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete package' })
  @ApiResponse({ status: 200 })
  async deletePackage(@Param('id') id: string): Promise<void> {
    await this.deletePackageUseCase.execute(id);
  }
}
