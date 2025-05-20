import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'

import { HardwareModule } from './hardware/hardware.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService<{ MONGO_URI: string }>],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          'MONGO_URI',
          'mongodb://localhost:27017/operator-registry-controller',
          { infer: true }
        ),
        retryAttempts: 0,
        lazyConnection: true
      })
    }),
    HardwareModule
  ]
})
export class CliModule {}
