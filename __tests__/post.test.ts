import path from 'path'
import os from 'os'
import fs from 'fs'
import { Context } from '@actions/github/lib/context'
import { expect, test, beforeEach, afterEach } from '@jest/globals'
import { replaceWorkspace, restoreWorkspace } from '../src/workspace'

const workflowName = 'test'
const jobName = 'testjob'
const githubWorkflow = 'Test workflow'
const githubWorkflowRef = `"DeNA/setup-job-workspace-action/.github/workflows/${workflowName}.yml@refs/heads/test_branch`
const contextMock = {
  workflow: githubWorkflow, // It same as `name` in workflow.yml. It is confusing with `workflow_ref`, so include it in mock.
  workflow_ref: githubWorkflowRef,
  job: jobName
} as unknown as Context

const origEnv = process.env
let tmpDirPath = ''
beforeEach(async () => {
  tmpDirPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), '_work'))
  process.env = {
    ...origEnv,
    RUNNER_WORKSPACE: `${path.join(tmpDirPath, 'testRepo')}`,
    GITHUB_WORKSPACE: `${path.join(tmpDirPath, 'testRepo', 'testRepo')}`,
    GITHUB_WORKFLOW: githubWorkflow,
    GITHUB_WORKFLOW_REF: githubWorkflowRef
  }
  await fs.promises.mkdir(process.env.GITHUB_WORKSPACE!, { recursive: true })

  // Do main step of own actions before each test
  const inputs = {
    workspaceName: '',
    repositoryName: 'my_repository',
    prefix: '',
    suffix: '',
    workingDirectory: ''
  }
  await replaceWorkspace(contextMock, inputs)
})

afterEach(async () => {
  process.env = origEnv
  await fs.promises.rm(tmpDirPath, { recursive: true })
})

test('restoreWorkspace()', async () => {
  await restoreWorkspace()

  const runnerWorkParent = path.dirname(process.env.RUNNER_WORKSPACE!)
  const virtualWorkspacePath = path.join(
    runnerWorkParent,
    'my_repository',
    `${workflowName}-${jobName}`
  )

  // /$GITHUB_WORKSPACE.bak/ is not exists
  expect(() => {
    fs.accessSync(`${process.env.GITHUB_WORKSPACE!}.bak`)
  }).toThrow()
  // /$GITHUB_WORKSPACE/ is not symlink
  expect(
    fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}`).isSymbolicLink()
  ).toBe(false)
  // virtual workspace is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
})
