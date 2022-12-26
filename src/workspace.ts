import path from 'path'
import fs from 'fs'
import * as core from '@actions/core'
import * as io from '@actions/io'
import { Context } from '@actions/github/lib/context'
import { getRunnerWorkspacePath, getWorkflowName, getWorkspacePath } from './github_env'

function escapeDirName (rawDirName: string): string {
  return rawDirName.trim().replace(/\s/g, '_').toLowerCase()
}

export function createDirName (context: Context, workspaceName: string, prefix: string, suffix: string): string {
  core.debug(`workspaceName: ${workspaceName}`)
  if (workspaceName !== '') return escapeDirName(`${prefix}${workspaceName}${suffix}`)

  const workflowName = getWorkflowName()
  return escapeDirName(`${prefix}${workflowName}-${context.job}${suffix}`)
}

export type InputOptions = {
  workspaceName: string,
  prefix: string,
  suffix: string,
}
export async function replaceWorkspace (context: Context, inputs: InputOptions): Promise<void> {
  // mv ${GITHUB_WORKSPACE} ${GITHUB_WORKSPACE}.bak
  const workspacePath = getWorkspacePath()
  const workspaceBakPath = workspacePath + '.bak'
  await io.mv(workspacePath, workspaceBakPath)
  core.info(`mv ${workspacePath} ${workspaceBakPath}`)

  // WORKFLOW_YAML=$(basename "${{ github.event.workflow }}" .yml)
  // TMP_DIR="${RUNNER_WORKSPACE}/${WORKFLOW_YAML}-${{ github.job }}"
  // mkdir -p ${TMP_DIR}
  const virtualWorkspacePath = path.join(getRunnerWorkspacePath(), createDirName(context, inputs.workspaceName, inputs.prefix, inputs.suffix))
  await io.mkdirP(virtualWorkspacePath)
  core.info(`mkdir -p ${virtualWorkspacePath}`)

  // ln -s "${TMP_DIR}" ${GITHUB_WORKSPACE}
  await fs.promises.symlink(virtualWorkspacePath, workspacePath)
  core.info(`ln -s ${virtualWorkspacePath} ${workspacePath}`)
}

export async function restoreWorkspace (): Promise<void> {
  const workspacePath = getWorkspacePath()
  // unlink ${GITHUB_WORKSPACE}
  await fs.promises.unlink(workspacePath)
  core.info(`unlink ${workspacePath}`)
  // mv ${GITHUB_WORKSPACE}.bak ${GITHUB_WORKSPACE}
  await fs.promises.rename(`${workspacePath}.bak`, workspacePath)
  core.info(`mv ${workspacePath}.bak ${workspacePath}`)
}
