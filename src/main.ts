import * as core from '@actions/core'
import * as github from '@actions/github'
import { InputOptions, replaceWorkspace } from './workspace'

async function run (): Promise<void> {
  try {
    const inputs: InputOptions = {
      workspaceName: core.getInput('workspace-name'),
      prefix: core.getInput('prefix'),
      suffix: core.getInput('suffix'),
      workingDirectory: core.getInput('working-directory')
    }
    await replaceWorkspace(github.context, inputs)
  } catch (error) {
    core.error(JSON.stringify(error))
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run().catch((error) => core.error(JSON.stringify(error)))
