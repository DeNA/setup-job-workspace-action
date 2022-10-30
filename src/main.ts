import * as core from '@actions/core'
import * as github from '@actions/github'
import { replaceWorkspace } from './workspace'

async function run (): Promise<void> {
  try {
    core.debug('Main process')

    const context = github.context

    const workspaceName: string | undefined = core.getInput('workspace-name')
    await replaceWorkspace(context, workspaceName)
  } catch (error) {
    console.dir(error)
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
