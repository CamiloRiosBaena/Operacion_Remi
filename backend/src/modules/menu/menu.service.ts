import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Categoria } from './entities/categoria.entity';
import { Plato } from './entities/plato.entity';
import { Ingrediente } from './entities/ingrediente.entity';
import { PlatoIngrediente } from './entities/plato-ingrediente.entity';
import { Extra } from './entities/extra.entity';

import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { CreatePlatoDto } from './dto/create-plato.dto';
import { UpdatePlatoDto } from './dto/update-plato.dto';
import { CreateIngredienteDto } from './dto/create-ingrediente.dto';
import { UpdateIngredienteDto } from './dto/update-ingrediente.dto';
import { CreateExtraDto } from './dto/create-extra.dto';
import { UpdateExtraDto } from './dto/update-extra.dto';
import { UpsertPlatoIngredienteDto } from './dto/upsert-plato-ingrediente.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categoriaRepo: Repository<Categoria>,
    @InjectRepository(Plato)
    private readonly platoRepo: Repository<Plato>,
    @InjectRepository(Ingrediente)
    private readonly ingredienteRepo: Repository<Ingrediente>,
    @InjectRepository(PlatoIngrediente)
    private readonly piRepo: Repository<PlatoIngrediente>,
    @InjectRepository(Extra)
    private readonly extraRepo: Repository<Extra>,
  ) {}

  // ─────────────────────────────────────────
  // CATEGORÍAS
  // ─────────────────────────────────────────

  findAllCategorias(): Promise<Categoria[]> {
    return this.categoriaRepo.find({ order: { nombre: 'ASC' } });
  }

  async createCategoria(dto: CreateCategoriaDto): Promise<Categoria> {
    const existe = await this.categoriaRepo.findOneBy({ nombre: dto.nombre });
    if (existe) throw new BadRequestException(`Ya existe la categoría "${dto.nombre}"`);
    return this.categoriaRepo.save(this.categoriaRepo.create(dto));
  }

  async updateCategoria(id: number, dto: Partial<CreateCategoriaDto>): Promise<Categoria> {
    const cat = await this.categoriaRepo.findOneBy({ id });
    if (!cat) throw new NotFoundException(`Categoría ${id} no encontrada`);
    Object.assign(cat, dto);
    return this.categoriaRepo.save(cat);
  }

  async deleteCategoria(id: number): Promise<void> {
    const cat = await this.categoriaRepo.findOne({
      where: { id },
      relations: ['platos'],
    });
    if (!cat) throw new NotFoundException(`Categoría ${id} no encontrada`);
    if (cat.platos.length > 0)
      throw new BadRequestException(
        `No puedes eliminar la categoría "${cat.nombre}" porque tiene ${cat.platos.length} plato(s) asociado(s)`,
      );
    await this.categoriaRepo.remove(cat);
  }

  // ─────────────────────────────────────────
  // PLATOS
  // ─────────────────────────────────────────

  findAllPlatos(): Promise<Plato[]> {
    return this.platoRepo.find({
      relations: ['categoria', 'extras', 'platoIngredientes', 'platoIngredientes.ingrediente'],
      order: { nombre: 'ASC' },
    });
  }

  async findOneConDetalles(id: number): Promise<Plato> {
    const plato = await this.platoRepo.findOne({
      where: { id },
      relations: ['categoria', 'extras', 'platoIngredientes', 'platoIngredientes.ingrediente'],
    });
    if (!plato) throw new NotFoundException(`Plato ${id} no encontrado`);
    return plato;
  }

  async createPlato(dto: CreatePlatoDto): Promise<Plato> {
    const categoria = await this.categoriaRepo.findOneBy({ id: dto.categoriaId });
    if (!categoria) throw new NotFoundException(`Categoría ${dto.categoriaId} no encontrada`);

    const plato = this.platoRepo.create({
      nombre: dto.nombre,
      precio: dto.precio,
      descripcion: dto.descripcion ?? null,
      imagenUrl: dto.imagenUrl ?? null,
      disponible: dto.disponible ?? true,
      tasaIva: dto.tasaIva ?? 0.19,
      categoria,
    });
    const saved = await this.platoRepo.save(plato);
    return this.findOneConDetalles(saved.id);
  }

  async updatePlato(id: number, dto: UpdatePlatoDto): Promise<Plato> {
    const plato = await this.findOneConDetalles(id);
    const raw = dto as Record<string, unknown>;

    if (raw['categoriaId'] !== undefined) {
      const catId = raw['categoriaId'] as number;
      const categoria = await this.categoriaRepo.findOneBy({ id: catId });
      if (!categoria) throw new NotFoundException(`Categoría ${catId} no encontrada`);
      plato.categoria = categoria;
    }

    const { categoriaId: _cat, ...rest } = raw;
    Object.assign(plato, rest);
    return this.platoRepo.save(plato);
  }

  async toggleDisponible(id: number): Promise<Plato> {
    const plato = await this.platoRepo.findOneBy({ id });
    if (!plato) throw new NotFoundException(`Plato ${id} no encontrado`);
    plato.disponible = !plato.disponible;
    return this.platoRepo.save(plato);
  }

  async deletePlato(id: number): Promise<void> {
    const plato = await this.platoRepo.findOneBy({ id });
    if (!plato) throw new NotFoundException(`Plato ${id} no encontrado`);
    await this.platoRepo.remove(plato);
  }

  // ─────────────────────────────────────────
  // INGREDIENTES
  // ─────────────────────────────────────────

  findAllIngredientes(): Promise<Ingrediente[]> {
    return this.ingredienteRepo.find({
      relations: ['platoIngredientes', 'platoIngredientes.plato'],
      order: { nombre: 'ASC' },
    });
  }

  async findOneIngrediente(id: number): Promise<Ingrediente> {
    const ing = await this.ingredienteRepo.findOne({
      where: { id },
      relations: ['platoIngredientes', 'platoIngredientes.plato'],
    });
    if (!ing) throw new NotFoundException(`Ingrediente ${id} no encontrado`);
    return ing;
  }

  async createIngrediente(dto: CreateIngredienteDto): Promise<Ingrediente> {
    const ing = this.ingredienteRepo.create({
      nombre: dto.nombre,
      unidadCompra: dto.unidadCompra ?? 'kg',
      gramosPorUnidad: dto.gramosPorUnidad,
      stockUnidades: dto.stockUnidades ?? 0,
      stockMinimoPorciones: dto.stockMinimoPorciones ?? 10,
      eliminable: dto.eliminable ?? true,
    });
    return this.ingredienteRepo.save(ing);
  }

  async updateIngrediente(id: number, dto: UpdateIngredienteDto): Promise<Ingrediente> {
    const ing = await this.ingredienteRepo.findOneBy({ id });
    if (!ing) throw new NotFoundException(`Ingrediente ${id} no encontrado`);
    Object.assign(ing, dto);
    return this.ingredienteRepo.save(ing);
  }

  async deleteIngrediente(id: number): Promise<void> {
    const ing = await this.ingredienteRepo.findOneBy({ id });
    if (!ing) throw new NotFoundException(`Ingrediente ${id} no encontrado`);
    await this.ingredienteRepo.remove(ing);
  }

  /**
   * Calcula el stock de porciones disponibles para un ingrediente.
   * gramosDisponibles = stockUnidades × gramosPorUnidad
   * Para cada plato que usa este ingrediente:
   *   porcionesEstimadas = floor(gramosDisponibles / gramosPorPorcion)
   */
  async getStockInfo(id: number) {
    const ing = await this.findOneIngrediente(id);
    const gramosDisponibles = Number(ing.stockUnidades) * Number(ing.gramosPorUnidad);

    const porciones = ing.platoIngredientes.map((pi) => ({
      platoId: pi.plato.id,
      platoNombre: pi.plato.nombre,
      gramosPorPorcion: Number(pi.gramosPorPorcion),
      porcionesEstimadas: Math.floor(gramosDisponibles / Number(pi.gramosPorPorcion)),
    }));

    return {
      ingrediente: { id: ing.id, nombre: ing.nombre, unidadCompra: ing.unidadCompra },
      stockUnidades: Number(ing.stockUnidades),
      gramosPorUnidad: Number(ing.gramosPorUnidad),
      gramosDisponibles,
      stockMinimoPorciones: ing.stockMinimoPorciones,
      alertaBaja: porciones.some((p) => p.porcionesEstimadas < ing.stockMinimoPorciones),
      porciones,
    };
  }

  // ─────────────────────────────────────────
  // EXTRAS
  // ─────────────────────────────────────────

  async findExtrasByPlato(platoId: number): Promise<Extra[]> {
    await this.platoRepo.findOneByOrFail({ id: platoId }).catch(() => {
      throw new NotFoundException(`Plato ${platoId} no encontrado`);
    });
    return this.extraRepo.find({ where: { plato: { id: platoId } } });
  }

  async createExtra(dto: CreateExtraDto): Promise<Extra> {
    const plato = await this.platoRepo.findOneBy({ id: dto.platoId });
    if (!plato) throw new NotFoundException(`Plato ${dto.platoId} no encontrado`);
    return this.extraRepo.save(
      this.extraRepo.create({ nombre: dto.nombre, precio: dto.precio, plato }),
    );
  }

  async updateExtra(id: number, dto: UpdateExtraDto): Promise<Extra> {
    const extra = await this.extraRepo.findOneBy({ id });
    if (!extra) throw new NotFoundException(`Extra ${id} no encontrado`);
    Object.assign(extra, dto);
    return this.extraRepo.save(extra);
  }

  async deleteExtra(id: number): Promise<void> {
    const extra = await this.extraRepo.findOneBy({ id });
    if (!extra) throw new NotFoundException(`Extra ${id} no encontrado`);
    await this.extraRepo.remove(extra);
  }

  // ─────────────────────────────────────────
  // PLATO-INGREDIENTES (relaciones)
  // ─────────────────────────────────────────

  async upsertPlatoIngrediente(platoId: number, dto: UpsertPlatoIngredienteDto): Promise<PlatoIngrediente> {
    const plato = await this.platoRepo.findOneBy({ id: platoId });
    if (!plato) throw new NotFoundException(`Plato ${platoId} no encontrado`);

    const ingrediente = await this.ingredienteRepo.findOneBy({ id: dto.ingredienteId });
    if (!ingrediente) throw new NotFoundException(`Ingrediente ${dto.ingredienteId} no encontrado`);

    // Si ya existe la relación, actualiza los gramos
    let pi = await this.piRepo.findOne({
      where: { plato: { id: platoId }, ingrediente: { id: dto.ingredienteId } },
    });

    if (pi) {
      pi.gramosPorPorcion = dto.gramosPorPorcion;
    } else {
      pi = this.piRepo.create({ plato, ingrediente, gramosPorPorcion: dto.gramosPorPorcion });
    }
    return this.piRepo.save(pi);
  }

  async deletePlatoIngrediente(platoId: number, ingredienteId: number): Promise<void> {
    const pi = await this.piRepo.findOne({
      where: { plato: { id: platoId }, ingrediente: { id: ingredienteId } },
    });
    if (!pi) throw new NotFoundException(`Relación plato ${platoId} — ingrediente ${ingredienteId} no existe`);
    await this.piRepo.remove(pi);
  }

  // ─────────────────────────────────────────
  // MENÚ PÚBLICO (solo disponibles)
  // ─────────────────────────────────────────

  /** Vista pública del menú — solo platos disponibles, agrupados por categoría */
  async getMenuPublico(): Promise<Categoria[]> {
    return this.categoriaRepo.find({
      relations: ['platos', 'platos.extras'],
      where: { platos: { disponible: true } },
      order: { nombre: 'ASC' },
    });
  }
}
