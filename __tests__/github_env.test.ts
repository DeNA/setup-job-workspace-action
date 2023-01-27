import { describe, expect, test, beforeEach, afterEach } from '@jest/globals'
import { getWorkflowName } from '../src/github_env'

const workflowName = 'test'
const githubWorkflow = "Test workflow"

const origEnv = process.env

describe("getWorkflowName()", () => {
  afterEach(async () => {
    process.env = origEnv
  })

  describe("with GITHUB_WORKFLOW_REF that introduced actions/runner v2.300.0", () => {
    beforeEach(async () => {
    })

    test("refs/heads", async () => {
      const githubWorkflowRef = `"Kesin11/setup-job-workspace-action/.github/workflows/${workflowName}.yml@refs/heads/test_branch`
      process.env = {
        ...origEnv,
        GITHUB_WORKFLOW: githubWorkflow,
        GITHUB_WORKFLOW_REF: githubWorkflowRef,
      }

      const actual = getWorkflowName()
      expect(actual).toEqual(workflowName)
    })
    test("refs/pull", async () => {
      const githubWorkflowRef = `"Kesin11/setup-job-workspace-action/.github/workflows/${workflowName}.yml@refs/pull/merge/90`
      process.env = {
        ...origEnv,
        GITHUB_WORKFLOW: githubWorkflow,
        GITHUB_WORKFLOW_REF: githubWorkflowRef,
      }

      const actual = getWorkflowName()
      expect(actual).toEqual(workflowName)
    })
  })

  describe("without GITHUB_WORKFLOW_REF", () => {
    test("fallback to get GITHUB_WORKFLOW", async () => {
      process.env = {
        ...origEnv,
        GITHUB_WORKFLOW: githubWorkflow,
        GITHUB_WORKFLOW_REF: undefined,
      }
      const actual = getWorkflowName()
      expect(actual).toEqual(githubWorkflow)
    })
  })
})
