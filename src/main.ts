import { CommandFactory } from 'nest-commander'

import { CliModule } from './cli.module'

const handleEerror = (error: Error) => {
  console.error('@anyone-protocol/admin-cli Error:', error.stack)
  process.exit(1)
}

const bootstrap = async () => {
  await CommandFactory.run(CliModule, {
    logger: ['error', 'warn', 'log', 'debug'],
    errorHandler: handleEerror,
    serviceErrorHandler: handleEerror
  })
}

bootstrap()
