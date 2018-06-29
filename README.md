# Nomics Platform Toolkit for Node.js

## Installation

`nomics-platform` is a Node.js package. You have multiple options for using it:

Easily run with npx:

```
npx nomics-platform
```

Or, install globally via npm:

```
npm install -g nomics-platform
```

Or, install globally via yarn:

```
yarn global add nomics-platform
```

Or, add it as a `devDependency` in your project's `package.json` to audit as part of your `scripts` or test suite.

## Usage

Usage is documented within the tool and can be viewed by running it with no arguments:

```
nomics-platform
```

## Performing Audits on Nomics Platform APIs

The `nomics-platform` tool can audit an API to determine its compatibility with the Nomics Platform.

Audit a url directly:

```
npx nomics-platform audit https://path-to-root-of-api/
```
