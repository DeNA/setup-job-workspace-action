import * as core from '@actions/core'
import fs from 'fs'
import { getWorkspacePath } from './main'


// unlink ${GITHUB_WORKSPACE}
// mv ${GITHUB_WORKSPACE}.bak ${GITHUB_WORKSPACE}
export async function restoreWorkspace(): Promise<void> {
  const workspacePath = getWorkspacePath()
  await fs.promises.unlink(workspacePath)
  await fs.promises.rename(`${workspacePath}.bak`, workspacePath)
}

async function run (): Promise<void> {
  try {
    core.debug(`Post process`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
