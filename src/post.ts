import * as core from '@actions/core'

// unlink ${GITHUB_WORKSPACE}
// mv ${GITHUB_WORKSPACE}.bak ${GITHUB_WORKSPACE}

async function run (): Promise<void> {
  try {
    core.debug(`Post process`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
