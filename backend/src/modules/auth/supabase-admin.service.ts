import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class SupabaseAdminService implements OnModuleInit {
  private client: SupabaseClient;
  private jwks: ReturnType<typeof createRemoteJWKSet>;
  private issuer: string;

  constructor(private readonly cfg: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.cfg.getOrThrow<string>('SUPABASE_URL');
    this.client = createClient(
      supabaseUrl,
      this.cfg.getOrThrow<string>('SUPABASE_SERVICE_ROLE'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    this.issuer = `${supabaseUrl}/auth/v1`;
    // Verifica el JWT contra las claves públicas del proyecto (JWKS) en vez de
    // llamar a la API de Supabase en cada request — evita el round-trip de red
    // (~1-5s en este proyecto) en cada endpoint protegido.
    this.jwks = createRemoteJWKSet(new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`));
  }

  get admin() {
    return this.client.auth.admin;
  }

  async verifyToken(token: string): Promise<User> {
    const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer });
    return {
      id: payload.sub,
      email: payload.email as string,
      user_metadata: (payload.user_metadata as Record<string, unknown>) ?? {},
      app_metadata: (payload.app_metadata as Record<string, unknown>) ?? {},
    } as User;
  }
}
