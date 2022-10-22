import path from 'path'
import os from 'os'
import fs from 'fs'
import { Context } from '@actions/github/lib/context'
import { expect, test, beforeEach, afterEach } from '@jest/globals'
import { createDirName, replaceWorkspace } from '../src/workspace'

const workflowName = "test"
const jobName = "testJob"
const contextMock = {
  payload: {
    workflow: `./.github/workflows/${workflowName}.yml`
  },
  job: jobName
} as unknown as Context

const origEnv = process.env
let tmpDirPath = ""
beforeEach(async () => {
  tmpDirPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), "_work"))
  process.env = {
    ...origEnv,
    RUNNER_WORKSPACE: `${path.join(tmpDirPath, "testRepo")}`,
    GITHUB_WORKSPACE: `${path.join(tmpDirPath, "testRepo", "testRepo")}`
  }
  await fs.promises.mkdir(process.env.GITHUB_WORKSPACE!, { recursive: true })
})

afterEach(async () => {
  process.env = origEnv
  await fs.promises.rm(tmpDirPath, { recursive: true })
})

test('createDirName() returns workspaceName', async () => {
  const workspaceName = "test-dir"
  const actual = createDirName(contextMock, workspaceName)
  await expect(actual).toEqual(workspaceName)
})

test('createDirName() returns default name', async () => {
  const actual = createDirName(contextMock, undefined)
  await expect(actual).toEqual(`${workflowName}-${jobName}`)
})

test('replaceWorkspace() with workspaceName', async () => {
  const workspaceName = "test-dir"
  await replaceWorkspace(contextMock, workspaceName)

  const concreteWorkspacePath = path.join(process.env.RUNNER_WORKSPACE!, workspaceName)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(concreteWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
})

test('replaceWorkspace() with no argument', async () => {
  await replaceWorkspace(contextMock, undefined)

  const concreteWorkspacePath = path.join(process.env.RUNNER_WORKSPACE!, `${workflowName}-${jobName}`)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(concreteWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
})