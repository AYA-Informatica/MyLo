# Security Policy

MyLo holds personal accounts and shows people information they may act on in legal
matters. We take reports seriously and will not take action against anyone who
reports a genuine issue in good faith.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's private reporting instead:
[Report a vulnerability](https://github.com/AYA-Informatica/MyLo/security/advisories/new)

Include what you can — affected endpoint or page, reproduction steps, and what an
attacker could achieve. A rough report sent early beats a polished one sent late.

We aim to acknowledge reports within a few days and to keep you updated while we
work on a fix.

## Scope

In scope: authentication and session handling, role and permission checks,
injection of any kind, exposure of another user's data, and anything that lets a
non-admin verify accounts or publish law content.

Also in scope, and easy to overlook: **law content integrity**. Anything that lets
an unauthorised party alter a law summary or attribute false legal advice to a
verified firm is a security issue here, not merely a bug, because people may act
on it.

Out of scope: findings against the third-party services MyLo integrates with
(report those to the vendor), and reports produced solely by an automated scanner
with no demonstrated impact.

## Handling secrets

Never commit real credentials. Only `.env.example` templates are tracked; every
`.env` is gitignored. The repository runs `trufflehog` through Trunk to catch
accidental secrets before they land.

If you do commit a secret, rotate it first, then tell us. Rotation matters more
than rewriting history — assume anything pushed to a public repository is already
compromised.
