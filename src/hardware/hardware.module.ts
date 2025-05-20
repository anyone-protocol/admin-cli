import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'

import { ImportKnownDevicesCommand } from './import-known-devices.command'
import { KnownDevice, KnownDeviceSchema } from './schema/known-device.schema'

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: KnownDevice.name, schema: KnownDeviceSchema }
    ])
  ],
  providers: [ ImportKnownDevicesCommand ]
})
export class HardwareModule {}
