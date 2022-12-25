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

function getWorkflowName(): string {
  const githubWorkflowRef = process.env.GITHUB_WORKFLOW_REF
  if (githubWorkflowRef) {
    // GITHUB_WORKFLOW_REF == ${{ github.workflow_ref }}:  `"Kesin11/setup-job-workspace-action/.github/workflows/test.yml@refs/heads/test_branch`,
    const workflowYaml = githubWorkflowRef.match(/(\w+\.ya?ml)/)![0]
    core.debug(`Found GITHUB_WORKFLOW_REF. workflow yaml: ${workflowYaml}`)

    const yamlExtName = path.extname(workflowYaml)
    return path.basename(workflowYaml, yamlExtName)
  }
  // GITHUB_WORKFLOW_REF does not appear if use old runner that before actions/runner@v2.300.0 
  // So it fallback for some case that must use old runner (e.g. GHES).
  else if (process.env.GITHUB_WORKFLOW) {
    core.debug(`Found GITHUB_WORKFLOW. workflow name: ${process.env.GITHUB_WORKFLOW}`)
    // GITHUB_WORKFLOW == ${{ github.workflow }} is `name` in yml: `name: 'build-test'`
    return process.env.GITHUB_WORKFLOW
  }
  else {
    throw new Error('Both env GITHUB_WORKFLOW_REF and GITHUB_WORKFLOW are undefined!')
  }
}

function escapeDirName (rawDirName: string): string {
  return rawDirName.trim().replace(/\s/g, '_')
}

export function createDirName (context: Context, workspaceName: string): string {
  core.debug(`workspaceName: ${workspaceName}`)
  if (workspaceName !== '') return escapeDirName(workspaceName)

  const workflowName = getWorkflowName()
  return escapeDirName(`${workflowName}-${context.job}`)
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
