import * as core from '@actions/core'
import { restoreWorkspace } from './workspace'

async function run (): Promise<void> {
  try {
    core.debug('Post process')
    await restoreWorkspace()
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
