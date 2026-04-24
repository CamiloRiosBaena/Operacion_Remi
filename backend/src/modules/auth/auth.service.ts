import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserStaff, RolStaff } from './entities/user-staff.entity';
import { Cliente, EstadoCliente } from './entities/cliente.entity';
import { SesionCliente } from './entities/sesion-cliente.entity';
import { SupabaseAdminService } from './supabase-admin.service';

import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { SyncPerfilDto } from './dto/sync-perfil.dto';
import { RegistroClienteDto } from './dto/registro-cliente.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserStaff)
    private readonly staffRepo: Repository<UserStaff>,
    @InjectRepository(Cliente)
    private readonly clienteRepo: Repository<Cliente>,
    @InjectRepository(SesionCliente)
    private readonly sesionRepo: Repository<SesionCliente>,
    private readonly supabase: SupabaseAdminService,
  ) {}

  // ─────────────────────────────────────────
  // SYNC DE CLIENTES (llamado tras signUp con Supabase)
  // ─────────────────────────────────────────

  async syncCliente(dto: SyncPerfilDto) {
    const existe = await this.clienteRepo.findOneBy({ supabase_uid: dto.supabase_uid });
    if (existe) return existe;

    return this.clienteRepo.save(
      this.clienteRepo.create({
        supabase_uid: dto.supabase_uid,
        nombre: dto.nombre,
        correo: dto.correo,
      }),
    );
  }

  // ─────────────────────────────────────────
  // REGISTRO DE CLIENTES (endpoint público — usa admin SDK, sin email)
  // ─────────────────────────────────────────

  async registroCliente(dto: RegistroClienteDto): Promise<Cliente> {
    const existe = await this.clienteRepo.findOneBy({ correo: dto.correo });
    if (existe) throw new BadRequestException(`El correo "${dto.correo}" ya está registrado`);

    const { data, error } = await this.supabase.admin.createUser({
      email: dto.correo,
      password: dto.contrasena,
      user_metadata: { nombre: dto.nombre, rol: 'cliente' },
      email_confirm: true,
    });
    if (error) throw new BadRequestException(error.message);

    return this.clienteRepo.save(
      this.clienteRepo.create({
        supabase_uid: data.user.id,
        nombre: dto.nombre,
        correo: dto.correo,
      }),
    );
  }

  // ─────────────────────────────────────────
  // STAFF (gestión por admin)
  // ─────────────────────────────────────────

  async findAllStaff(): Promise<UserStaff[]> {
    return this.staffRepo.find({ order: { nombre: 'ASC' } });
  }

  async findOneStaff(id: number): Promise<UserStaff> {
    const staff = await this.staffRepo.findOneBy({ id });
    if (!staff) throw new NotFoundException(`Usuario staff ${id} no encontrado`);
    return staff;
  }

  async createStaff(dto: CreateStaffDto): Promise<UserStaff> {
    const existe = await this.staffRepo.findOneBy({ correo: dto.correo });
    if (existe) throw new BadRequestException(`El correo "${dto.correo}" ya está registrado`);

    const { data, error } = await this.supabase.admin.createUser({
      email: dto.correo,
      password: dto.contrasena,
      user_metadata: { nombre: dto.nombre, rol: dto.rol },
      email_confirm: true,
    });
    if (error) throw new BadRequestException(error.message);

    return this.staffRepo.save(
      this.staffRepo.create({
        supabase_uid: data.user.id,
        nombre: dto.nombre,
        correo: dto.correo,
        rol: dto.rol as RolStaff,
      }),
    );
  }

  async updateStaff(id: number, dto: UpdateStaffDto): Promise<UserStaff> {
    const staff = await this.staffRepo.findOneBy({ id });
    if (!staff) throw new NotFoundException(`Usuario staff ${id} no encontrado`);

    if (dto.nombre || dto.rol) {
      await this.supabase.admin.updateUserById(staff.supabase_uid, {
        user_metadata: {
          ...(dto.nombre && { nombre: dto.nombre }),
          ...(dto.rol && { rol: dto.rol }),
        },
      });
    }

    if (dto.contrasena) {
      await this.supabase.admin.updateUserById(staff.supabase_uid, {
        password: dto.contrasena,
      });
      delete dto.contrasena;
    }

    Object.assign(staff, dto);
    return this.staffRepo.save(staff);
  }

  async deleteStaff(id: number, callerUid: string): Promise<void> {
    const staff = await this.staffRepo.findOneBy({ id });
    if (!staff) throw new NotFoundException(`Usuario staff ${id} no encontrado`);
    if (staff.supabase_uid === callerUid)
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    await this.supabase.admin.deleteUser(staff.supabase_uid);
    await this.staffRepo.remove(staff);
  }

  // ─────────────────────────────────────────
  // CLIENTES
  // ─────────────────────────────────────────

  async findAllClientes(): Promise<Cliente[]> {
    return this.clienteRepo.find({ order: { nombre: 'ASC' } });
  }

  async updateEstadoCliente(id: number, estado: EstadoCliente) {
    const cliente = await this.clienteRepo.findOneBy({ id });
    if (!cliente) throw new NotFoundException(`Cliente ${id} no encontrado`);
    cliente.estado = estado;
    return this.clienteRepo.save(cliente);
  }
}
