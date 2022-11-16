[![actions-test](https://github.com/Kesin11/setup-job-workspace-action/actions/workflows/actions-test.yml/badge.svg)](https://github.com/Kesin11/setup-job-workspace-action/actions/workflows/actions-test.yml)
[![build-test](https://github.com/Kesin11/setup-job-workspace-action/actions/workflows/test.yml/badge.svg)](https://github.com/Kesin11/setup-job-workspace-action/actions/workflows/test.yml)

# setup-job-workspace-action
An action creating virtual workspace directory for each jobs. It useful when using self-hosted runner with huge size of repository.

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

This action create new virtual workspace directory and replace $GITHUB_WORKSPACE to symlink that target to it. So GitHub Actions runner treats new directory as job workspace, if creating new directory per jobs, we can realize to create workspace per job like Jenkins.

That hacks can make by two phase and few of simple commands.

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
When using GitHub hosted runner, its provided new VM for each jobs. On the other hand, self-hosted runner run on same machine and also reused same directory as workspace ($GITHUB_WORKSPACE). `actions/checkout` clean workspace before checkout using `git clean -ffdx` in default, it works fine with common size of repository.

However, when repository size is too large it has problem. Some of build workflow will download large binary tool for current build and output large build cache for next build, so `actions/checkout` default cleaning is insufficient sometimes.

And also some of git options for example `sparse checkout` is very efficient for job that only needs few of files in large repository. However, self-hosted runner has just only workspace directory for a repository and `actions/checkout` does not supports some of advanced git options, large repository that has many GitHub Actions jobs may have git performance issue.

If jobs can have each workspace, job can reuse .git that created by `git clone` with advanced options. It resolves git performance issue. Jenkins has been used same directory structure and it has been succeed. `setup-job-workspace-action` also realize it in GitHub Actions.

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