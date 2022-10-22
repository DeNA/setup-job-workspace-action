import path from 'path'
import fs from 'fs'
import * as core from '@actions/core'
import * as io from '@actions/io'
import { Context } from '@actions/github/lib/context'

// /_work/self-hosted-sandbox/self-hosted-sandbox
export function getWorkspacePath(): string {
  if (!process.env.GITHUB_WORKSPACE) {
    throw new Error('env GITHUB_WORKSPACE is undefined!')
  }
  return process.env.GITHUB_WORKSPACE
}

// /_work/self-hosted-sandbox
function getRunnerWorkspacePath(): string {
  if (!process.env.RUNNER_WORKSPACE) throw new Error('env RUNNER_WORKSPACE is undefined!')
  return process.env.RUNNER_WORKSPACE
}

export function createDirName(context: Context, workspaceName: string | undefined): string {
  if (workspaceName) return workspaceName

  // NOTE: これが本当に取れるかは若干怪しい気がする
  const workflowYaml = context.payload.workflow as string
  core.notice(`workflowYaml: ${workflowYaml}`)

  const yamlExtName = path.extname(workflowYaml)
  const workflowYamlBaseName = path.basename(workflowYaml, yamlExtName)

  return `${workflowYamlBaseName}-${context.job}`
}

export async function replaceWorkspace(context: Context, workspaceName: string | undefined): Promise<void> {
  // mv ${GITHUB_WORKSPACE} ${GITHUB_WORKSPACE}.bak
  const workspacePath = getWorkspacePath()
  const workspaceBakPath = workspacePath + '.bak'
  await io.mv(workspacePath, workspaceBakPath)

  // WORKFLOW_YAML=$(basename "${{ github.event.workflow }}" .yml)
  // TMP_DIR="${RUNNER_WORKSPACE}/${WORKFLOW_YAML}-${{ github.job }}"
  // mkdir -p ${TMP_DIR}
  const concreteWorkspacePath = path.join(getRunnerWorkspacePath(), createDirName(context, workspaceName)) 
  await io.mkdirP(concreteWorkspacePath)

  // ln -s "${TMP_DIR}" ${GITHUB_WORKSPACE}
  await fs.promises.symlink(concreteWorkspacePath, workspacePath)
  return
}

export async function restoreWorkspace(): Promise<void> {
  const workspacePath = getWorkspacePath()
  // unlink ${GITHUB_WORKSPACE}
  await fs.promises.unlink(workspacePath)
  // mv ${GITHUB_WORKSPACE}.bak ${GITHUB_WORKSPACE}
  await fs.promises.rename(`${workspacePath}.bak`, workspacePath)
}

