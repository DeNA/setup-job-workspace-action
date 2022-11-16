[![actions-test](https://github.com/Kesin11/setup-job-workspace-action/actions/workflows/actions-test.yml/badge.svg)](https://github.com/Kesin11/setup-job-workspace-action/actions/workflows/actions-test.yml)
[![build-test](https://github.com/Kesin11/setup-job-workspace-action/actions/workflows/test.yml/badge.svg)](https://github.com/Kesin11/setup-job-workspace-action/actions/workflows/test.yml)

# setup-job-workspace-action
An action creating a virtual workspace directory for each job. It is useful when using self-hosted runner with large size of repository.

## Usage
```yaml
jobs:
  default:
    runs-on: [self-hosted]
    steps:
      # Use before actions/checkout
      - uses: Kesin11/setup-job-workspace-action@v1
      - uses: actions/checkout@v3

      # ... your build steps

  given_dir_name:
    runs-on: [self-hosted]
    steps:
      # Use before actions/checkout
      - uses: Kesin11/setup-job-workspace-action@v1
        with:
          # You can change workspace name from default: ${workspace-yaml-name}-${job-name}
          workspace_name: foo_bar_workspace
      - uses: actions/checkout@v3

      # ... your build steps
```

### Options
See [action.yml](./action.yml)

## How it works
GitHub Actions runner only has one workspace directory per repository ($GITHUB_WORKSPACE). That path is defined by the repository name, for example the workspace path of this repository is `/home/runner/work/setup-job-workspace-action/setup-job-workspace-action` in GitHub hosted Ubuntu runner.

This action creates a new virtual workspace directory and replaces $GITHUB_WORKSPACE as symlink that target to it. So GitHub Actions runner treats the new virtual workspace as a job workspace, it is possible to separate workspace for each job like Jenkins by creating a virtual workspace per job.

That hack can make in two phases that have a few simple commands.

### Phase 1: Create virtual workspace directory and symlink before `actions/checkout`.

```bash
mv ${GITHUB_WORKSPACE} ${GITHUB_WORKSPACE}.bak
TMP_DIR="${RUNNER_WORKSPACE}/${WORKFLOW_YAML}-${{ github.job }}"
mkdir -p ${TMP_DIR}
ln -s "${TMP_DIR}" ${GITHUB_WORKSPACE}
```

### Phase 2: Restore original $GITHUB_WORKSPACE after complete job.

```bash
unlink ${GITHUB_WORKSPACE}
mv ${GITHUB_WORKSPACE}.bak ${GITHUB_WORKSPACE}
```

## Why need it
When using GitHub-hosted runner, a new VM is given for each job. On the other hand, self-hosted runner runs on the same machine, a single workspace($GITHUB_WORKSPACE) is used for jobs that in the same repository. `actions/checkout` cleans workspace before checkout using `git clean -ffdx` in default, it works fine for a normal sized repository.

However, there are some problems when repository size is too large. Some of the workflows will download large binary tools for a current build and output large build cache for the next build, so `actions/checkout` default cleaning is inefficient sometimes.

And also some git options like `sparse checkout` are very efficient if your job only need a few files and size of repository is too large. However, `git clone` and `git fetch` performance can be problem because self-hosted runner has only one workspace and `actions/checkout` does not support some advanced git options.

This problem can be solved if each job has its own workspace and can reuse `.git/` created by advanced git options. Jenkins has been successful in this way for a long time. `setup-job-workspace-action` also realizes it on GitHub Actions.

## Development
```bash
npm run build
npm run lint
npm run test
```

You should bundle to update `dist` then commit them before create pull-request.

```bash
npm run package
#or
npm run all
```