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
          workspace_name: foo_bar_workspace
      - uses: actions/checkout@v3

      # ... your build steps
```

### Options
See [action.yml](./action.yml)

## How it works
GitHub Actions runner has only one workspace directory per repository ($GITHUB_WORKSPACE). That path is defined by repository name, so for example the workspace path of this repository is `/home/runner/work/setup-job-workspace-action/setup-job-workspace-action` in GitHub hosted Ubuntu runner.

This action creates a new virtual workspace directory and replaces $GITHUB_WORKSPACE to symlink that target it. So GitHub Actions runner treats the new virtual workspace as a job workspace, if creating a new virtual workspace per job, we can realize creating a workspace per job like Jenkins.

That hack can make in two phases and a few simple commands.

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
When using GitHub-hosted runner, it provided a new VM for each job. On the other hand, self-hosted runner runs on the same machine and also reused the same directory as job workspace ($GITHUB_WORKSPACE). `actions/checkout` cleans workspace before checkout using `git clean -ffdx` in default, it works fine with common size of repository.

However, when repository size is too large it has some problems. Some of the workflows will download large binary tools for a current build and output large build cache for the next build, so `actions/checkout` default cleaning is inefficient sometimes.

And also some of git options for example `sparse checkout` is very efficient for jobs that only need a few files in large repository. However, self-hosted runner has just only a workspace directory for a repository, and `actions/checkout` does not support some advanced git options, large repository that has many GitHub Actions jobs may have git performance issues.

If jobs can have each workspace, a job can reuse .git that was created by `git clone` with advanced options. It resolves git performance issues. Jenkins has been using same directory of structure and it has succeeded. `setup-job-workspace-action` also realizes it in GitHub Actions.

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