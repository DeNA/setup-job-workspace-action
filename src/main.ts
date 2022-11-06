import * as core from '@actions/core'
import * as github from '@actions/github'
import { replaceWorkspace } from './workspace'

async function run (): Promise<void> {
  try {
    const workspaceName: string = core.getInput('workspace-name')
    await replaceWorkspace(github.context, workspaceName)
  } catch (error) {
    core.error(JSON.stringify(error))
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run().catch((error) => core.error(JSON.stringify(error)))
