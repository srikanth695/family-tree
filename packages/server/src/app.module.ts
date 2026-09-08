import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PeopleModule } from './people/people.module';
import { RelationshipsModule } from './relationships/relationships.module';
import { MediaModule } from './media/media.module';
import { LifeEventModule } from './life-events/life-events.module';
import { TreesModule } from './trees/trees.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    CommonModule,
    AuthModule,
    UsersModule,
    TreesModule,
    PeopleModule,
    RelationshipsModule,
    MediaModule,
    LifeEventModule,
  ],
})
export class AppModule {}
