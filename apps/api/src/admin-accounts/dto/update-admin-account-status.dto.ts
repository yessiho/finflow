import { IsIn } from 'class-validator';

export class UpdateAdminAccountStatusDto {
  @IsIn(['ACTIVE', 'FROZEN', 'CLOSED'])
  status!: 'ACTIVE' | 'FROZEN' | 'CLOSED';
}