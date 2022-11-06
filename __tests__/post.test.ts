import path from 'path'
import os from 'os'
import fs from 'fs'
import { Context } from '@actions/github/lib/context'
import { expect, test, beforeEach, afterEach } from '@jest/globals'
import { replaceWorkspace, restoreWorkspace } from '../src/workspace'

const workflowName = 'test'
const jobName = 'testJob'
const contextMock = {
  workflow: `./.github/workflows/${workflowName}.yml`,
  job: jobName
} as unknown as Context

const origEnv = process.env
let tmpDirPath = ''
beforeEach(async () => {
  tmpDirPath = await fs.promises.mkdtemp(path.join(os.tmpdir(), '_work'))
  process.env = {
    ...origEnv,
    RUNNER_WORKSPACE: `${path.join(tmpDirPath, 'testRepo')}`,
    GITHUB_WORKSPACE: `${path.join(tmpDirPath, 'testRepo', 'testRepo')}`
  }
  await fs.promises.mkdir(process.env.GITHUB_WORKSPACE!, { recursive: true })

  // Do main step of own actions before each test
  await replaceWorkspace(contextMock, "")
})

afterEach(async () => {
  process.env = origEnv
  await fs.promises.rm(tmpDirPath, { recursive: true })
})

test('restoreWorkspace()', async () => {
  await restoreWorkspace()

  const concreteWorkspacePath = path.join(process.env.RUNNER_WORKSPACE!, `${workflowName}-${jobName}`)

  // /$GITHUB_WORKSPACE.bak/ is not exists
  expect(() => {
    fs.accessSync(`${process.env.GITHUB_WORKSPACE!}.bak`)
  }).toThrow()
  // /$GITHUB_WORKSPACE/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}`).isSymbolicLink()).toBe(false)
  // concrete workspace is exists
  expect(fs.accessSync(concreteWorkspacePath)).toBeUndefined()
})
