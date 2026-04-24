import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAdminService implements OnModuleInit {
  private client: SupabaseClient;

  constructor(private readonly cfg: ConfigService) {}

  onModuleInit() {
    this.client = createClient(
      this.cfg.getOrThrow<string>('SUPABASE_URL'),
      this.cfg.getOrThrow<string>('SUPABASE_SERVICE_ROLE'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  get admin() {
    return this.client.auth.admin;
  }

  async verifyToken(token: string) {
    return this.client.auth.getUser(token);
  }
}
