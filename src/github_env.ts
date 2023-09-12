import path from 'path'
import * as core from '@actions/core'

// /_work/self-hosted-sandbox/self-hosted-sandbox
export function getWorkspacePath (): string {
  if (process.env.GITHUB_WORKSPACE === undefined) {
    throw new Error('env GITHUB_WORKSPACE is undefined!')
  }
  return process.env.GITHUB_WORKSPACE
}

// /_work/self-hosted-sandbox
export function getRunnerWorkspacePath (): string {
  if (process.env.RUNNER_WORKSPACE === undefined) throw new Error('env RUNNER_WORKSPACE is undefined!')
  return process.env.RUNNER_WORKSPACE
}

export function getWorkflowName (): string {
  const githubWorkflowRef = process.env.GITHUB_WORKFLOW_REF
  if (githubWorkflowRef != null) {
    // env.GITHUB_WORKFLOW_REF is equal to ${{ github.workflow_ref }}. ex: `"DeNA/setup-job-workspace-action/.github/workflows/action-test.yml@refs/heads/test_branch`,
    const workflowYaml = githubWorkflowRef.match(/(\.github\/workflows\/.+\.ya?ml)/)![0]
    core.debug(`Found GITHUB_WORKFLOW_REF. workflow yaml: ${workflowYaml}`)

    const yamlExtName = path.extname(workflowYaml)
    return path.basename(workflowYaml, yamlExtName)
  } else if (process.env.GITHUB_WORKFLOW != null) {
    // GITHUB_WORKFLOW_REF does not appear if use old runner that before actions/runner@v2.300.0
    // So it fallback for some case that must use old runner (e.g. GHES).
    core.debug(`Found GITHUB_WORKFLOW. workflow name: ${process.env.GITHUB_WORKFLOW}`)
    // GITHUB_WORKFLOW == ${{ github.workflow }} is `name` in yml: `name: 'build-test'`
    return process.env.GITHUB_WORKFLOW
  } else {
    throw new Error('Both env GITHUB_WORKFLOW_REF and GITHUB_WORKFLOW are undefined!')
  }
}
