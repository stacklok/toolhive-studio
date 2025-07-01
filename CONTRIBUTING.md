# Contributing to ToolHive <!-- omit from toc -->

First off, thank you for taking the time to contribute to ToolHive! :+1: :tada:
ToolHive is released under the Apache 2.0 license. If you would like to
contribute something or want to hack on the code, this document should help you
get started. You can find some hints for starting development in ToolHive's
[README](https://github.com/stacklok/toolhive/blob/main/README.md).

## Table of contents <!-- omit from toc -->

- [Code of conduct](#code-of-conduct)
- [Reporting security vulnerabilities](#reporting-security-vulnerabilities)
- [How to contribute](#how-to-contribute)
  - [Using GitHub Issues](#using-github-issues)
  - [Not sure how to start contributing?](#not-sure-how-to-start-contributing)
  - [Pull request process](#pull-request-process)
  - [Contributing to docs](#contributing-to-docs)
  - [Commit message guidelines](#commit-message-guidelines)

## Code of conduct

This project adheres to the
[Contributor Covenant](./CODE_OF_CONDUCT.md)
code of conduct. By participating, you are expected to uphold this code. Please
report unacceptable behavior to
[code-of-conduct@stacklok.dev](mailto:code-of-conduct@stacklok.dev).

## Reporting security vulnerabilities

If you think you have found a security vulnerability in ToolHive please DO NOT
disclose it publicly until we've had a chance to fix it. Please don't report
security vulnerabilities using GitHub issues; instead, please follow this
[process](./SECURITY.MD)

## How to contribute

### Using GitHub Issues

We use GitHub issues to track bugs and enhancements. If you have a general usage
question, please ask in
[ToolHive's discussion forum](https://discord.gg/stacklok).

If you are reporting a bug, please help to speed up problem diagnosis by
providing as much information as possible. Ideally, that would include a small
sample project that reproduces the problem.

### Not sure how to start contributing?

PRs to resolve existing issues are greatly appreciated, and issues labeled as
["good first issue"](https://github.com/StacklokLabs/toolhive-studio/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22)
are a great place to start!

### Pull request process

- -All commits must include a Signed-off-by trailer at the end of each commit
  message to indicate that the contributor agrees to the Developer Certificate
  of Origin. For additional details, check out the [DCO instructions](./DCO.md).
- Create an issue outlining the fix or feature.
- Fork the ToolHive repository to your own GitHub account and clone it locally.
- Hack on your changes.
- Correctly format your commit messages, see
  [Commit message guidelines](#commit-message-guidelines) below.
- Open a PR with a title that follows the conventional commit format (e.g.,
  `feat: add new feature` or `fix: resolve issue`). The PR title will be
  validated to ensure it follows the conventional commit specification. Ensure
  the description reflects the content of the PR.
- Ensure that CI passes, if it fails, fix the failures.
- Every pull request requires a review from the core ToolHive team before
  merging.
- Once approved, all of your commits will be squashed into a single commit with
  your PR title.

### Contributing to docs

The ToolHive user documentation website is maintained in the
[docs-website](https://github.com/stacklok/docs-website) repository. If you want
to contribute to the documentation, please open a PR in that repo.

Please review the README and
[STYLE-GUIDE](https://github.com/stacklok/docs-website/blob/main/STYLE-GUIDE.md)
in the docs-website repository for more information on how to contribute to the
documentation.

### Commit message guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

**Examples:**

- `feat: add new MCP server registry endpoint`
- `fix(ui): resolve button alignment issue in dark mode`
- `docs: update installation instructions`
- `test: add unit tests for secret validation`
