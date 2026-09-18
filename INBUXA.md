# ihasmail-inbuxa

This is ihasmail for INBUXA's mail server. Public ihasmail stays
Stalwart-facing; everything specific to INBUXA lives here until one product
can serve both. The contract between the two is `docs/spec/contract.md` in
the inbuxa-server repository.

Public ihasmail is the remote `ihasmail`, fetch-only. Merge its `main` in to
keep up. Nothing here is pushed there.

## What's different

- **Sign-in happens on the mail server's own page** (contract C-8, C-10).
  ihasmail sends the browser there and gets OAuth tokens back, so it never
  handles a password to sign someone in. Two-factor codes are asked for on
  that page. Sessions hold sealed tokens and renew them before they expire. A
  password change revokes the tokens, so it signs the person out everywhere,
  this session included.
- **Tenants are offered on every server**, whatever edition it reports.
  `SHOW_ENTERPRISE_NOTICES` still adds the notice for an upstream Stalwart.

## Configuration

Server sign-in is on when `OAUTH_CLIENT_SECRET` is set. Without it,
ihasmail-inbuxa keeps public ihasmail's password form.

| Variable | Meaning |
|---|---|
| `OAUTH_CLIENT_SECRET` | The secret of the confidential client the mail server registers for this webmail. On INBUXA, the same value as the server's `INBUXA_WEBMAIL_CLIENT_SECRET`. |
| `OAUTH_CLIENT_ID` | The client's id. Default `ihasmail-inbuxa`, which is what INBUXA registers. |
| `PUBLIC_URL` | Where browsers reach ihasmail, without `BASE_PATH`. Required with `OAUTH_CLIENT_SECRET`. The redirect URI is `PUBLIC_URL` + `BASE_PATH` + `/api/auth/callback`, and must match the server's `INBUXA_WEBMAIL_URL` + `/api/auth/callback` exactly. |

On the INBUXA server, set `INBUXA_WEBMAIL_URL` to ihasmail's address (with
`BASE_PATH`, if any) and `INBUXA_WEBMAIL_CLIENT_SECRET` to the shared secret.
The server registers the client on start and allows ihasmail's origin for
cross-origin requests.

For local development, `npm run dev:mock` works as before. The mock also
answers OAuth: start it and ihasmail with `OAUTH_CLIENT_SECRET=mock-oauth-secret`
and a `PUBLIC_URL`, and its sign-in page approves the demo user at once.
