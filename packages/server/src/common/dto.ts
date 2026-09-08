import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsIn,
  IsBoolean,
  IsArray,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { SYSTEM_ROLES } from '@family-tree/types';
import { ALL_ROLES } from './pick';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class OAuthUpsertDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  avatar_url?: string;
}

export class CreateTreeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class UpdateTreeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class AddTreeMemberDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsIn([...ALL_ROLES])
  role?: string;
}

export class UpdateUserRoleDto {
  @IsIn([...SYSTEM_ROLES])
  role!: string;
}

export class LinkParentsDto {
  @IsString()
  child_id!: string;

  @IsString()
  father_id!: string;

  @IsString()
  mother_id!: string;
}

export class CreatePersonDto {
  @IsString()
  @MinLength(1)
  first_name!: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  maiden_name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nicknames?: string[];

  @IsIn(['male', 'female'])
  gender!: string;

  @IsDateString()
  birth_date!: string;

  @IsOptional()
  @IsString()
  birth_date_precision?: string;

  @IsOptional()
  @IsString()
  birth_place?: string;

  @IsOptional()
  @IsDateString()
  death_date?: string;

  @IsOptional()
  @IsString()
  death_date_precision?: string;

  @IsOptional()
  @IsString()
  death_place?: string;

  @IsOptional()
  @IsBoolean()
  is_living?: boolean;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  cause_of_death?: string;

  @IsOptional()
  @IsString()
  burial_place?: string;

  @IsOptional()
  @IsBoolean()
  is_child?: boolean;

  @IsOptional()
  @IsString()
  father_id?: string;

  @IsOptional()
  @IsString()
  mother_id?: string;
}

export class UpdatePersonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsString()
  maiden_name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nicknames?: string[];

  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: string;

  @IsOptional()
  @IsDateString()
  birth_date?: string;

  @IsOptional()
  @IsString()
  birth_date_precision?: string;

  @IsOptional()
  @IsString()
  birth_place?: string;

  @IsOptional()
  @IsDateString()
  death_date?: string;

  @IsOptional()
  @IsString()
  death_date_precision?: string;

  @IsOptional()
  @IsString()
  death_place?: string;

  @IsOptional()
  @IsBoolean()
  is_living?: boolean;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  cause_of_death?: string;

  @IsOptional()
  @IsString()
  burial_place?: string;
}

export class CreateRelationshipDto {
  @IsString()
  person_a_id!: string;

  @IsString()
  person_b_id!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateRelationshipDto {
  @IsOptional()
  @IsString()
  person_a_id?: string;

  @IsOptional()
  @IsString()
  person_b_id?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateLifeEventDto {
  @IsString()
  type!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  event_date?: string;

  @IsOptional()
  @IsString()
  place?: string;
}

export class UpdateLifeEventDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  event_date?: string;

  @IsOptional()
  @IsString()
  place?: string;
}
