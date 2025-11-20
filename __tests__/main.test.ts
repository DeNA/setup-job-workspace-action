import path from 'path'
import os from 'os'
import fs from 'fs'
import { Context } from '@actions/github/lib/context'
import { expect, test, beforeEach, afterEach } from '@jest/globals'
import { createDirName, replaceWorkspace } from '../src/workspace'

const workflowName = 'test'
const jobName = 'testjob'
const githubWorkflow = "Test workflow"
const githubWorkflowRef = `"DeNA/setup-job-workspace-action/.github/workflows/${workflowName}.yml@refs/heads/test_branch`
const contextMock = {
  workflow: githubWorkflow, // It same as `name` in workflow.yml. It is confusing with `workflow_ref`, so include it in mock.
  workflow_ref: githubWorkflowRef,
  job: jobName
} as unknown as Context
const dummyFile = "test.txt"
const dummyFileContent = "test"

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
  await fs.promises.writeFile(`${process.env.GITHUB_WORKSPACE!}/${dummyFile}`, dummyFileContent)
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
  const workspaceName = 'Test Dir'
  const actual = createDirName(contextMock, workspaceName, "", "")
  await expect(actual).toEqual('test_dir')
})

test('createDirName() returns escaped workspaceName with prefix and suffix', async () => {
  const workspaceName = 'Test Dir'
  const prefix = "Prefix-"
  const suffix = "-Suffix"
  const actual = createDirName(contextMock, workspaceName, prefix, suffix)
  await expect(actual).toEqual("prefix-test_dir-suffix")
})

test('createDirName() returns default name', async () => {
  const actual = createDirName(contextMock, "", "", "")
  await expect(actual).toEqual(`${workflowName}-${jobName}`)
})

test('createDirName() returns escaped default name', async () => {
  const jobName = 'Test Job'
  const overrideMock = {
    ...contextMock,
    job: jobName
  } as unknown as Context

  const actual = createDirName(overrideMock, "", "", "")
  await expect(actual).toEqual(`${workflowName}-test_job`)
})

test('createDirName() returns escaped default name with prefix and suffix', async () => {
  const jobName = 'Test Job'
  const overrideMock = {
    ...contextMock,
    job: jobName
  } as unknown as Context
  const prefix = "Prefix-"
  const suffix = "-Suffix"

  const actual = createDirName(overrideMock, "", prefix, suffix)
  await expect(actual).toEqual(`prefix-${workflowName}-test_job-suffix`)
})

test('replaceWorkspace() with workspaceName', async () => {
  const inputs = {
    workspaceName: 'test-dir',
    repositoryName: 'my_repository',
    prefix: '',
    suffix: '',
    workingDirectory: '',
  }
  await replaceWorkspace(contextMock, inputs)

  const runnerWorkParent = path.dirname(process.env.RUNNER_WORKSPACE!)
  const virtualWorkspacePath = path.join(runnerWorkParent, inputs.repositoryName, inputs.workspaceName)

  // Create dummy file to check symlink is valid or not.
  const virtualWorkspaceFile = path.join(virtualWorkspacePath, dummyFile)
  await fs.promises.writeFile(virtualWorkspaceFile, dummyFileContent, 'utf8')
  const virtualWorkspaceLinkFile = path.join(virtualWorkspacePath, dummyFile)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
  // /$virtualWorkspaceFile is exists
  expect(fs.existsSync(virtualWorkspaceFile)).toBe(true)
  // /$GITHUB_WORKSPACE/${dummyFile} is directory symlink.
  expect(fs.readdirSync(process.env.GITHUB_WORKSPACE!)[0]).toBe(dummyFile)
  // /$GITHUB_WORKSPACE/${dummyFile} content is readable through symlink.
  expect(fs.readFileSync(virtualWorkspaceLinkFile, 'utf8')).toBe(dummyFileContent)
})

test('replaceWorkspace() with workingDirectory', async () => {
  const inputs = {
    workspaceName: '',
    repositoryName: 'my_repository',
    prefix: '',
    suffix: '',
    workingDirectory: '..',
  }
  await replaceWorkspace(contextMock, inputs)

  const runnerWorkParent = path.dirname(process.env.RUNNER_WORKSPACE!)
  const virtualWorkspacePath = path.join(runnerWorkParent, inputs.repositoryName, `${workflowName}-${jobName}`)

  // Create dummy file to check symlink is valid or not.
  const virtualWorkspaceFile = path.join(virtualWorkspacePath, dummyFile)
  await fs.promises.writeFile(virtualWorkspaceFile, dummyFileContent, 'utf8')
  const virtualWorkspaceLinkFile = path.join(virtualWorkspacePath, dummyFile)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
  // /$virtualWorkspaceFile is exists
  expect(fs.existsSync(virtualWorkspaceFile)).toBe(true)
  // /$GITHUB_WORKSPACE/${dummyFile} is directory symlink.
  expect(fs.readdirSync(process.env.GITHUB_WORKSPACE!)[0]).toBe(dummyFile)
  // /$GITHUB_WORKSPACE/${dummyFile} content is readable through symlink.
  expect(fs.readFileSync(virtualWorkspaceLinkFile, 'utf8')).toBe(dummyFileContent)
})

test('replaceWorkspace() with repository name and default input', async () => {
  const inputs = {
    workspaceName: '',
    repositoryName: 'my_repository',
    prefix: '',
    suffix: '',
    workingDirectory: '',
  }
  await replaceWorkspace(contextMock, inputs)

  const runnerWorkParent = path.dirname(process.env.RUNNER_WORKSPACE!)
  const virtualWorkspacePath = path.join(runnerWorkParent, inputs.repositoryName, `${workflowName}-${jobName}`)

  // Create dummy file to check symlink is valid or not.
  const virtualWorkspaceFile = path.join(virtualWorkspacePath, dummyFile)
  await fs.promises.writeFile(virtualWorkspaceFile, dummyFileContent, 'utf8')
  const virtualWorkspaceLinkFile = path.join(virtualWorkspacePath, dummyFile)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
  // /$virtualWorkspaceFile is exists
  expect(fs.existsSync(virtualWorkspaceFile)).toBe(true)
  // /$GITHUB_WORKSPACE/${dummyFile} is directory symlink.
  expect(fs.readdirSync(process.env.GITHUB_WORKSPACE!)[0]).toBe(dummyFile)
  // /$GITHUB_WORKSPACE/${dummyFile} content is readable through symlink.
  expect(fs.readFileSync(virtualWorkspaceLinkFile, 'utf8')).toBe(dummyFileContent)
})

test('replaceWorkspace() with empty repository', async () => {
  const inputs = {
    workspaceName: 'test-dir',
    repositoryName: '',
    prefix: '',
    suffix: '',
    workingDirectory: '',
  }
  await replaceWorkspace(contextMock, inputs)

  const virtualWorkspacePath = path.join(process.env.RUNNER_WORKSPACE!, inputs.workspaceName)

  // Create dummy file to check symlink is valid or not.
  const virtualWorkspaceFile = path.join(virtualWorkspacePath, dummyFile)
  await fs.promises.writeFile(virtualWorkspaceFile, dummyFileContent, 'utf8')
  const virtualWorkspaceLinkFile = path.join(virtualWorkspacePath, dummyFile)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
  // /$virtualWorkspaceFile is exists
  expect(fs.existsSync(virtualWorkspaceFile)).toBe(true)
  // /$GITHUB_WORKSPACE/${dummyFile} is directory symlink.
  expect(fs.readdirSync(process.env.GITHUB_WORKSPACE!)[0]).toBe(dummyFile)
  // /$GITHUB_WORKSPACE/${dummyFile} content is readable through symlink.
  expect(fs.readFileSync(virtualWorkspaceLinkFile, 'utf8')).toBe(dummyFileContent)
})

test('replaceWorkspace() with empty repository and default input', async () => {
  const inputs = {
    workspaceName: '',
    repositoryName: '',
    prefix: '',
    suffix: '',
    workingDirectory: '',
  }
  await replaceWorkspace(contextMock, inputs)

  const virtualWorkspacePath = path.join(process.env.RUNNER_WORKSPACE!, `${workflowName}-${jobName}`)

  // Create dummy file to check symlink is valid or not.
  const virtualWorkspaceFile = path.join(virtualWorkspacePath, dummyFile)
  await fs.promises.writeFile(virtualWorkspaceFile, dummyFileContent, 'utf8')
  const virtualWorkspaceLinkFile = path.join(virtualWorkspacePath, dummyFile)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
  // /$virtualWorkspaceFile is exists
  expect(fs.existsSync(virtualWorkspaceFile)).toBe(true)
  // /$GITHUB_WORKSPACE/${dummyFile} is directory symlink.
  expect(fs.readdirSync(process.env.GITHUB_WORKSPACE!)[0]).toBe(dummyFile)
  // /$GITHUB_WORKSPACE/${dummyFile} content is readable through symlink.
  expect(fs.readFileSync(virtualWorkspaceLinkFile, 'utf8')).toBe(dummyFileContent)
})

test('replaceWorkspace() with repository name containing path separator', async () => {
  const inputs = {
    workspaceName: 'test-dir',
    repositoryName: 'org/my_repository',
    prefix: '',
    suffix: '',
    workingDirectory: '',
  }
  await replaceWorkspace(contextMock, inputs)

  // Should use only the basename (my_repository) not the full path
  const runnerWorkParent = path.dirname(process.env.RUNNER_WORKSPACE!)
  const virtualWorkspacePath = path.join(runnerWorkParent, 'my_repository', inputs.workspaceName)

  // Create dummy file to check symlink is valid or not.
  const virtualWorkspaceFile = path.join(virtualWorkspacePath, dummyFile)
  await fs.promises.writeFile(virtualWorkspaceFile, dummyFileContent, 'utf8')
  const virtualWorkspaceLinkFile = path.join(virtualWorkspacePath, dummyFile)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
  // /$virtualWorkspaceFile is exists
  expect(fs.existsSync(virtualWorkspaceFile)).toBe(true)
  // /$GITHUB_WORKSPACE/${dummyFile} is directory symlink.
  expect(fs.readdirSync(process.env.GITHUB_WORKSPACE!)[0]).toBe(dummyFile)
  // /$GITHUB_WORKSPACE/${dummyFile} content is readable through symlink.
  expect(fs.readFileSync(virtualWorkspaceLinkFile, 'utf8')).toBe(dummyFileContent)
})

test('replaceWorkspace() with repository name containing whitespace', async () => {
  const inputs = {
    workspaceName: 'test-dir',
    repositoryName: '  my_repository  ',
    prefix: '',
    suffix: '',
    workingDirectory: '',
  }
  await replaceWorkspace(contextMock, inputs)

  // Should trim whitespace
  const runnerWorkParent = path.dirname(process.env.RUNNER_WORKSPACE!)
  const virtualWorkspacePath = path.join(runnerWorkParent, 'my_repository', inputs.workspaceName)

  // Create dummy file to check symlink is valid or not.
  const virtualWorkspaceFile = path.join(virtualWorkspacePath, dummyFile)
  await fs.promises.writeFile(virtualWorkspaceFile, dummyFileContent, 'utf8')
  const virtualWorkspaceLinkFile = path.join(virtualWorkspacePath, dummyFile)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
  // /$virtualWorkspaceFile is exists
  expect(fs.existsSync(virtualWorkspaceFile)).toBe(true)
  // /$GITHUB_WORKSPACE/${dummyFile} is directory symlink.
  expect(fs.readdirSync(process.env.GITHUB_WORKSPACE!)[0]).toBe(dummyFile)
  // /$GITHUB_WORKSPACE/${dummyFile} content is readable through symlink.
  expect(fs.readFileSync(virtualWorkspaceLinkFile, 'utf8')).toBe(dummyFileContent)
})

test('replaceWorkspace() with repository name containing relative path', async () => {
  const inputs = {
    workspaceName: 'test-dir',
    repositoryName: '../my_repository',
    prefix: '',
    suffix: '',
    workingDirectory: '',
  }
  await replaceWorkspace(contextMock, inputs)

  // Should use only the basename (my_repository) not the relative path
  const runnerWorkParent = path.dirname(process.env.RUNNER_WORKSPACE!)
  const virtualWorkspacePath = path.join(runnerWorkParent, 'my_repository', inputs.workspaceName)

  // Create dummy file to check symlink is valid or not.
  const virtualWorkspaceFile = path.join(virtualWorkspacePath, dummyFile)
  await fs.promises.writeFile(virtualWorkspaceFile, dummyFileContent, 'utf8')
  const virtualWorkspaceLinkFile = path.join(virtualWorkspacePath, dummyFile)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
  // /$virtualWorkspaceFile is exists
  expect(fs.existsSync(virtualWorkspaceFile)).toBe(true)
  // /$GITHUB_WORKSPACE/${dummyFile} is directory symlink.
  expect(fs.readdirSync(process.env.GITHUB_WORKSPACE!)[0]).toBe(dummyFile)
  // /$GITHUB_WORKSPACE/${dummyFile} content is readable through symlink.
  expect(fs.readFileSync(virtualWorkspaceLinkFile, 'utf8')).toBe(dummyFileContent)
})

test('replaceWorkspace() with repository name containing parent directory references', async () => {
  const inputs = {
    workspaceName: 'test-dir',
    repositoryName: '../../my_repository',
    prefix: '',
    suffix: '',
    workingDirectory: '',
  }
  await replaceWorkspace(contextMock, inputs)

  // Should use only the basename (my_repository) not the parent directory references
  const runnerWorkParent = path.dirname(process.env.RUNNER_WORKSPACE!)
  const virtualWorkspacePath = path.join(runnerWorkParent, 'my_repository', inputs.workspaceName)

  // Create dummy file to check symlink is valid or not.
  const virtualWorkspaceFile = path.join(virtualWorkspacePath, dummyFile)
  await fs.promises.writeFile(virtualWorkspaceFile, dummyFileContent, 'utf8')
  const virtualWorkspaceLinkFile = path.join(virtualWorkspacePath, dummyFile)

  // /$RUNNER_WORKSPACE/{workspaceName}/ is exists
  expect(fs.accessSync(virtualWorkspacePath)).toBeUndefined()
  // /$GITHUB_WORKSPACE.bak/ is not symlink
  expect(fs.lstatSync(`${process.env.GITHUB_WORKSPACE!}.bak`).isSymbolicLink()).toBe(false)
  // /$GITHUB_WORKSPACE is symlink
  expect(fs.lstatSync(process.env.GITHUB_WORKSPACE!).isSymbolicLink()).toBe(true)
  // /$virtualWorkspaceFile is exists
  expect(fs.existsSync(virtualWorkspaceFile)).toBe(true)
  // /$GITHUB_WORKSPACE/${dummyFile} is directory symlink.
  expect(fs.readdirSync(process.env.GITHUB_WORKSPACE!)[0]).toBe(dummyFile)
  // /$GITHUB_WORKSPACE/${dummyFile} content is readable through symlink.
  expect(fs.readFileSync(virtualWorkspaceLinkFile, 'utf8')).toBe(dummyFileContent)
})
