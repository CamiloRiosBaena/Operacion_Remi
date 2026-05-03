import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AsistenteService } from './asistente.service';
import { ChatRequestDto } from './dto/chat.dto';
import { SupabaseGuard } from '../auth/supabase.guard';

@Controller('asistente')
export class AsistenteController {
  constructor(private readonly asistente: AsistenteService) {}

  @Post('chat')
  @UseGuards(SupabaseGuard)
  chat(@Body() dto: ChatRequestDto) {
    return this.asistente.chat(dto.messages);
  }
}
