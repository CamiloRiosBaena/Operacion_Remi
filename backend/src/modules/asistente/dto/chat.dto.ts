import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessageDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  content: string;
}

export class ChatRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];
}

export interface CartActionDto {
  platoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  tasaIva: number;
  categoria: string;
  imageUrl?: string;
  extras?: { nombre: string; precio: number; cantidad: number }[];
  ingredientesRemovidos?: string[];
  nota?: string;
}

export interface ChatResponseDto {
  mensaje: string;
  cartActions: CartActionDto[];
}
