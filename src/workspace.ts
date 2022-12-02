import path from 'path'
import fs from 'fs'
import * as core from '@actions/core'
import * as io from '@actions/io'
import { Context } from '@actions/github/lib/context'

// /_work/self-hosted-sandbox/self-hosted-sandbox
export function getWorkspacePath (): string {
  if (process.env.GITHUB_WORKSPACE === undefined) {
    throw new Error('env GITHUB_WORKSPACE is undefined!')
  }
  return process.env.GITHUB_WORKSPACE
}

// /_work/self-hosted-sandbox
function getRunnerWorkspacePath (): string {
  if (process.env.RUNNER_WORKSPACE === undefined) throw new Error('env RUNNER_WORKSPACE is undefined!')
  return process.env.RUNNER_WORKSPACE
}

export function createDirName (context: Context, workspaceName: string): string {
  core.debug(`workspaceName: ${workspaceName}`)
  if (workspaceName !== '') return workspaceName

  const workflowYaml = context.workflow
  core.debug(`workflowYaml: ${workflowYaml}`)

  const yamlExtName = path.extname(workflowYaml)
  const workflowYamlBaseName = path.basename(workflowYaml, yamlExtName)

  return `${workflowYamlBaseName}-${context.job}`
}

export async function replaceWorkspace (context: Context, workspaceName: string): Promise<void> {
  // mv ${GITHUB_WORKSPACE} ${GITHUB_WORKSPACE}.bak
  const workspacePath = getWorkspacePath()
  const workspaceBakPath = workspacePath + '.bak'
  await io.mv(workspacePath, workspaceBakPath)
  core.info(`mv ${workspacePath} ${workspaceBakPath}`)

  // WORKFLOW_YAML=$(basename "${{ github.event.workflow }}" .yml)
  // TMP_DIR="${RUNNER_WORKSPACE}/${WORKFLOW_YAML}-${{ github.job }}"
  // mkdir -p ${TMP_DIR}
  const virtualWorkspacePath = path.join(getRunnerWorkspacePath(), createDirName(context, workspaceName))
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
