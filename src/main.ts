import * as core from '@actions/core'

// mv ${GITHUB_WORKSPACE} ${GITHUB_WORKSPACE}.bak
// WORKFLOW_YAML=$(basename "${{ github.event.workflow }}" .yml)
// TMP_DIR="${RUNNER_WORKSPACE}/${WORKFLOW_YAML}-${{ github.job }}"
// mkdir -p ${TMP_DIR}
// ln -s "${TMP_DIR}" ${GITHUB_WORKSPACE}

async function run (): Promise<void> {
  try {
    core.debug(`Main process`)

  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
