import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { CreatePlatoDto } from './dto/create-plato.dto';
import { UpdatePlatoDto } from './dto/update-plato.dto';
import { CreateIngredienteDto } from './dto/create-ingrediente.dto';
import { UpdateIngredienteDto } from './dto/update-ingrediente.dto';
import { CreateExtraDto } from './dto/create-extra.dto';
import { UpdateExtraDto } from './dto/update-extra.dto';
import { UpsertPlatoIngredienteDto } from './dto/upsert-plato-ingrediente.dto';
import { CreatePromoDto, UpdatePromoDto } from './dto/promo.dto';
import { SupabaseGuard } from '../auth/supabase.guard';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ─────────────────────────────────────────
  // MENÚ PÚBLICO
  // GET /api/menu/publico
  // ─────────────────────────────────────────

  @Get('publico')
  getMenuPublico() {
    return this.menuService.getMenuPublico();
  }

  // ─────────────────────────────────────────
  // CATEGORÍAS
  // ─────────────────────────────────────────

  @Get('categorias')
  findAllCategorias() {
    return this.menuService.findAllCategorias();
  }

  @Post('categorias')
  createCategoria(@Body() dto: CreateCategoriaDto) {
    return this.menuService.createCategoria(dto);
  }

  @Patch('categorias/:id')
  updateCategoria(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateCategoriaDto>,
  ) {
    return this.menuService.updateCategoria(id, dto);
  }

  @Delete('categorias/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCategoria(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.deleteCategoria(id);
  }

  // ─────────────────────────────────────────
  // PLATOS
  // ─────────────────────────────────────────

  @Get('platos')
  findAllPlatos() {
    return this.menuService.findAllPlatos();
  }

  @Get('platos/:id')
  findOnePlato(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findOneConDetalles(id);
  }

  @Post('platos')
  createPlato(@Body() dto: CreatePlatoDto) {
    return this.menuService.createPlato(dto);
  }

  @Patch('platos/:id')
  updatePlato(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlatoDto,
  ) {
    return this.menuService.updatePlato(id, dto);
  }

  @Patch('platos/:id/disponibilidad')
  toggleDisponible(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.toggleDisponible(id);
  }

  @Delete('platos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePlato(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.deletePlato(id);
  }

  // ─────────────────────────────────────────
  // EXTRAS
  // ─────────────────────────────────────────

  @Get('platos/:id/extras')
  findExtrasByPlato(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findExtrasByPlato(id);
  }

  @Post('extras')
  createExtra(@Body() dto: CreateExtraDto) {
    return this.menuService.createExtra(dto);
  }

  @Patch('extras/:id')
  updateExtra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExtraDto,
  ) {
    return this.menuService.updateExtra(id, dto);
  }

  @Delete('extras/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteExtra(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.deleteExtra(id);
  }

  // ─────────────────────────────────────────
  // INGREDIENTES
  // ─────────────────────────────────────────

  @Get('ingredientes')
  findAllIngredientes() {
    return this.menuService.findAllIngredientes();
  }

  @Get('ingredientes/:id')
  findOneIngrediente(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findOneIngrediente(id);
  }

  @Get('ingredientes/:id/stock')
  getStockInfo(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.getStockInfo(id);
  }

  @Post('ingredientes')
  createIngrediente(@Body() dto: CreateIngredienteDto) {
    return this.menuService.createIngrediente(dto);
  }

  @Patch('ingredientes/:id')
  updateIngrediente(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIngredienteDto,
  ) {
    return this.menuService.updateIngrediente(id, dto);
  }

  @Delete('ingredientes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteIngrediente(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.deleteIngrediente(id);
  }

  // ─────────────────────────────────────────
  // PLATO-INGREDIENTES (relaciones)
  // ─────────────────────────────────────────

  @Post('platos/:id/ingredientes')
  upsertPlatoIngrediente(
    @Param('id', ParseIntPipe) platoId: number,
    @Body() dto: UpsertPlatoIngredienteDto,
  ) {
    return this.menuService.upsertPlatoIngrediente(platoId, dto);
  }

  @Delete('platos/:platoId/ingredientes/:ingredienteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePlatoIngrediente(
    @Param('platoId', ParseIntPipe) platoId: number,
    @Param('ingredienteId', ParseIntPipe) ingredienteId: number,
  ) {
    return this.menuService.deletePlatoIngrediente(platoId, ingredienteId);
  }

  // ─────────────────────────────────────────
  // PROMOS BANNER
  // ─────────────────────────────────────────

  /** Público — solo promos activas, ordenadas */
  @Get('promos')
  getActivePromos() {
    return this.menuService.findActivePromos();
  }

  /** Admin — todas las promos */
  @Get('promos/todas')
  @UseGuards(SupabaseGuard)
  getAllPromos() {
    return this.menuService.findAllPromos();
  }

  @Post('promos')
  @UseGuards(SupabaseGuard)
  createPromo(@Body() dto: CreatePromoDto) {
    return this.menuService.createPromo(dto);
  }

  @Patch('promos/:id')
  @UseGuards(SupabaseGuard)
  updatePromo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromoDto,
  ) {
    return this.menuService.updatePromo(id, dto);
  }

  @Delete('promos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SupabaseGuard)
  deletePromo(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.deletePromo(id);
  }
}
