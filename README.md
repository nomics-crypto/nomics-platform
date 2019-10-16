# Nomics Platform

[![Build Status](https://travis-ci.org/nomics-crypto/nomics-platform.svg?branch=master)](https://travis-ci.org/nomics-crypto/nomics-platform)

This repository contains Nomics Integration Specifications as well as an auditing tool to verify compliance with the specification.

## Auditing

To audit your endpoint, install Node.js and run:

```
npx nomics-platform@0.13.7 audit https://path-to-your-api-root
```

If data functionality needs to be audited prior to all metadata being available, you can use the `NOMICS_PLATFORM_RELAX`
environment variable to temporarily relax requirements for description length, logo URL, and location. This flag will
also skip checks for markets `type` and `active` flags.

```bash
NOMICS_PLATFORM_RELAX=1 npx nomics-platform audit https://path-to-your-api-root
```

## Nomics Integration Specifications

- [Cryptocurrency API Exchange Integration Specification](doc/cryptocurrency-api-exchange-integration.md)
