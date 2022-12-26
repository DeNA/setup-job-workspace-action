import path from 'path'
import os from 'os'
import fs from 'fs'
import { Context } from '@actions/github/lib/context'
import { expect, test, beforeEach, afterEach } from '@jest/globals'
import { createDirName, replaceWorkspace } from '../src/workspace'

const workflowName = 'test'
const jobName = 'testJob'
const githubWorkflow = "Test workflow"
const githubWorkflowRef = `"Kesin11/setup-job-workspace-action/.github/workflows/${workflowName}.yml@refs/heads/test_branch`
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
    GITHUB_WORKFLOW_REF: githubWorkflowRef,
  }
  await fs.promises.mkdir(process.env.GITHUB_WORKSPACE!, { recursive: true })
})

afterEach(async () => {
  process.env = origEnv
  await fs.promises.rm(tmpDirPath, { recursive: true })
})

test('createDirName() returns workspaceName', async () => {
  const workspaceName = 'test-dir'
  const actual = createDirName(contextMock, workspaceName, "", "")
  await expect(actual).toEqual(workspaceName)
})

test('createDirName() returns escaped workspaceName', async () => {
  const workspaceName = 'test dir'
  const actual = createDirName(contextMock, workspaceName, "", "")
  await expect(actual).toEqual('test_dir')
})

test('createDirName() returns escaped workspaceName with prefix and suffix', async () => {
  const workspaceName = 'test dir'
  const prefix = "prefix-"
  const suffix = "-suffix"
  const actual = createDirName(contextMock, workspaceName, prefix, suffix)
  await expect(actual).toEqual(`${prefix}test_dir${suffix}`)
})

test('createDirName() returns default name', async () => {
  const actual = createDirName(contextMock, "", "", "")
  await expect(actual).toEqual(`${workflowName}-${jobName}`)
})

test('createDirName() returns escaped default name', async () => {
  const jobName = 'test Job'
  const overrideMock = {
    ...contextMock,
    job: jobName
  } as unknown as Context

  const actual = createDirName(overrideMock, "", "", "")
  await expect(actual).toEqual(`${workflowName}-test_Job`)
})

test('createDirName() returns escaped default name with prefix and suffix', async () => {
  const jobName = 'test Job'
  const overrideMock = {
    ...contextMock,
    job: jobName
  } as unknown as Context
  const prefix = "prefix-"
  const suffix = "-suffix"

  const actual = createDirName(overrideMock, "", prefix, suffix)
  await expect(actual).toEqual(`${prefix}${workflowName}-test_Job${suffix}`)
})

test('replaceWorkspace() with workspaceName', async () => {
  const inputs = {
    workspaceName: 'test-dir',
    prefix: '',
    suffix: '',
  }
  await replaceWorkspace(contextMock, inputs)

  const virtualWorkspacePath = path.join(process.env.RUNNER_WORKSPACE!, inputs.workspaceName)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
})

test('replaceWorkspace() with default input', async () => {
  const inputs = {
    workspaceName: '',
    prefix: '',
    suffix: '',
  }
  await replaceWorkspace(contextMock, inputs)

  const virtualWorkspacePath = path.join(process.env.RUNNER_WORKSPACE!, `${workflowName}-${jobName}`)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
})
