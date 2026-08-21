import path from 'path'
import fs from 'fs'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as github from '@actions/github'

type Context = typeof github.context
import {
  getRunnerWorkspacePath,
  getWorkflowName,
  getWorkspacePath
} from './github_env.js'

function escapeDirName(rawDirName: string): string {
  return rawDirName.trim().replace(/\s/g, '_').toLowerCase()
}

export function createDirName(
  context: Context,
  workspaceName: string,
  prefix: string,
  suffix: string
): string {
  core.debug(`workspaceName: ${workspaceName}`)
  if (workspaceName !== '')
    return escapeDirName(`${prefix}${workspaceName}${suffix}`)

  const workflowName = getWorkflowName()
  return escapeDirName(`${prefix}${workflowName}-${context.job}${suffix}`)
}

export interface InputOptions {
  workspaceName: string
  repositoryName: string
  prefix: string
  suffix: string
  workingDirectory: string
}
export async function replaceWorkspace(
  context: Context,
  inputs: InputOptions
): Promise<void> {
  // cd ${WORKING_DIRECTORY}
  if (inputs.workingDirectory !== '') {
    const workingDirectory = path.resolve(inputs.workingDirectory)
    core.info(`cd ${process.cwd()} -> ${workingDirectory}`)
    process.chdir(workingDirectory)
  }

  // mv ${GITHUB_WORKSPACE} ${GITHUB_WORKSPACE}.bak
  const workspacePath = getWorkspacePath()
  const workspaceBakPath = workspacePath + '.bak'
  await io.mv(workspacePath, workspaceBakPath)
  core.info(`mv ${workspacePath} ${workspaceBakPath}`)

  // WORKFLOW_YAML=$(basename "${{ github.event.workflow }}" .yml)
  // TMP_DIR="/_work/${repository}/${WORKFLOW_YAML}-${{ github.job }}" or "${RUNNER_WORKSPACE}/${WORKFLOW_YAML}-${{ github.job }}"
  // mkdir -p ${TMP_DIR}
  const workspaceDirName = createDirName(
    context,
    inputs.workspaceName,
    inputs.prefix,
    inputs.suffix
  )
  const sanitizedRepositoryName =
    inputs.repositoryName !== ''
      ? path.basename(inputs.repositoryName.trim())
      : ''
  const virtualWorkspacePath =
    sanitizedRepositoryName !== ''
      ? path.join(
          path.dirname(getRunnerWorkspacePath()),
          sanitizedRepositoryName,
          workspaceDirName
        )
      : path.join(getRunnerWorkspacePath(), workspaceDirName)
  await io.mkdirP(virtualWorkspacePath)
  core.info(`mkdir -p ${virtualWorkspacePath}`)

  // ln -s "${TMP_DIR}" ${GITHUB_WORKSPACE}
  await fs.promises.symlink(virtualWorkspacePath, workspacePath, 'dir')
  core.info(`ln -s ${virtualWorkspacePath} ${workspacePath}`)
  const realPath = await fs.promises.realpath(virtualWorkspacePath)
  core.setOutput('real-path', realPath)

  exportWorkspacePwd(workspacePath)
}

// git resolves symlinks before it evaluates `includeIf.gitdir` conditions, so a
// condition that contains $GITHUB_WORKSPACE (e.g. the credential config that
// `actions/checkout` v6 or later writes) never matches the real path of the
// virtual workspace created by this action.
// git falls back to matching the condition against $PWD when $PWD points to the
// same directory as the current directory, so exporting $PWD as the symlinked
// $GITHUB_WORKSPACE makes such conditions match again.
// see: https://github.com/DeNA/setup-job-workspace-action/issues/296
function exportWorkspacePwd(workspacePath: string): void {
  // git for Windows does not use $PWD, so exporting it has no effect there.
  if (process.platform === 'win32') return

  core.exportVariable('PWD', workspacePath)
  core.info(`export PWD as ${workspacePath}`)
}

export async function restoreWorkspace(): Promise<void> {
  const workspacePath = getWorkspacePath()
  // unlink ${GITHUB_WORKSPACE}
  await fs.promises.unlink(workspacePath)
  core.info(`unlink ${workspacePath}`)
  // mv ${GITHUB_WORKSPACE}.bak ${GITHUB_WORKSPACE}
  await fs.promises.rename(`${workspacePath}.bak`, workspacePath)
  core.info(`mv ${workspacePath}.bak ${workspacePath}`)
}
