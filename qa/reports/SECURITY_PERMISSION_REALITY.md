# Security and Permission Reality

## What the application currently enforces

- Content and Super Admin views expose different UI controls.
- A negative PIN attempt is rejected through the normal UI.
- Content sanitization passed the tested browser case.

## What it does not enforce

- Super Admin can be opened directly from browser code.
- The loopback API has no authenticated Content/Super role.
- Any process running as the same Windows user can call the local API.
- A client-side PIN cannot protect against DevTools or direct requests.

## Practical security boundary

The only credible boundary in this architecture is the Windows account plus filesystem/share ACL. That boundary was not tested with separate accounts in this environment. Until a real ACL matrix is proven, role separation must be described as a convenience/UI workflow, not security.

