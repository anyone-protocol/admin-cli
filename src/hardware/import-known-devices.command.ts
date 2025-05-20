import { Logger } from '@nestjs/common'
import { InjectModel, raw } from '@nestjs/mongoose'
import { readFile } from 'fs/promises'
import { Command, CommandRunner } from 'nest-commander'
import { Model } from 'mongoose'

import {
  KnownDevice,
  KnownDeviceDecodedManifest,
  KnownDeviceRawManifest
} from './schema/known-device.schema'

@Command({
  name: 'import-known-devices',
  arguments: '<raw-manifest.json>'
})
export class ImportKnownDevicesCommand extends CommandRunner {
  private readonly logger = new Logger(ImportKnownDevicesCommand.name)

  constructor(
    @InjectModel(KnownDevice.name)
    private readonly knownDeviceModel: Model<KnownDevice>,
  ) {
    super()
  }

  async run(args: string[], _options: Record<string, any>): Promise<void> {
    const [ rawManifestPath ] = args
    this.logger.log(`Importing devices from manifest ${rawManifestPath}`)

    const rawManifestsBuffer = await readFile(rawManifestPath)
    const rawManifests: KnownDeviceRawManifest[] = JSON.parse(
      rawManifestsBuffer.toString('utf-8')
    )
    this.logger.log(`Found ${rawManifests.length} device manifests to import`)

    const knownDevices: Omit<KnownDevice, 'createdAt'>[] = []
    for (const rawManifest of rawManifests) {
      const uniqueId = rawManifest.header.uniqueId
      if (!uniqueId || typeof uniqueId !== 'string') {
        this.logger.error(
          `Device has no uniqueId: ${JSON.stringify(rawManifest)}`
        )
        continue
      }
      const existingDevice = await this.knownDeviceModel.exists({ uniqueId })
      if (existingDevice) {
        this.logger.warn(
          `Device ${uniqueId} already exists in the database, skipping`
        )
        continue
      }
      const payloadBase64 = rawManifest.payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
      const decodedBuffer = Buffer.from(payloadBase64, 'base64')
      const decoded: KnownDeviceDecodedManifest = JSON.parse(
        decodedBuffer.toString('utf-8')
      )

      const publicKey1 = decoded.publicKeySet.keys[0]
      if (publicKey1.kid !== '0') {
        this.logger.warn(
          `Device ${uniqueId} has a public key with kid ${publicKey1.kid}, ` +
            `expected 0`
        )
      }

      const mapJwkPubKeyToHexString = ({ x, y }: { x: string, y: string }) => {
        const xBase64 = x.replace(/-/g, '+').replace(/_/g, '/')
        const yBase64 = y.replace(/-/g, '+').replace(/_/g, '/')
        const xBuffer = Buffer.from(xBase64, 'base64')
        const yBuffer = Buffer.from(yBase64, 'base64')
        const pubKeyY = yBuffer.toString('hex')
        const pubKeyX = xBuffer.toString('hex')
        if (pubKeyX.length !== 64) {
          this.logger.warn(
            `Device ${uniqueId} has a public key with x ${pubKeyX}, ` +
              `expected 32 bytes`
          )
        }
        if (pubKeyY.length !== 64) {
          this.logger.warn(
            `Device ${uniqueId} has a public key with y ${pubKeyY}, ` +
              `expected 32 bytes`
          )
        }
        return `${xBuffer.toString('hex')}${yBuffer.toString('hex')}`
      }

      knownDevices.push({
        uniqueId,
        raw: rawManifest,
        decoded,
        pubKeyHex: mapJwkPubKeyToHexString(publicKey1),
        pubKeysHex: decoded.publicKeySet.keys.map(mapJwkPubKeyToHexString)
      })
    }

    this.logger.log(`Found ${knownDevices.length} devices to import`)
    
    if (knownDevices.length > 0) {
      this.logger.log('Inserting devices into the database')
      const result = await this.knownDeviceModel.insertMany(knownDevices, {
        ordered: false
      })
      this.logger.log(`Inserted ${result.length} devices into the database`)
    }

    this.logger.log('Done importing known devices')
    process.exit(0)
  }
}
