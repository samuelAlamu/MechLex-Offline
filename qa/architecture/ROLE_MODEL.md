# Role Model

## Intended roles

| Role | Intended capability |
|---|---|
| Viewer | Read/search only |
| Content Expert | Create/edit dictionary content and embedded images |
| Super Admin | Content plus appearance, maintenance, backup/restore and PIN changes |

## Actual enforcement

- PIN validation occurs only in the visible PIN form.
- `openAdmin(role)` is a global function and sets `adminUnlocked=true` for any supplied role.
- Tabs are hidden with CSS/DOM state; privileged actions do not re-check a trusted role.
- Direct `openAdmin("super")` opened Super Admin controls in Edge without a PIN.
- The shared API does not authenticate Viewer/Expert/Super Admin; it trusts same-origin plus a fixed header.
- PIN values are part of shared settings and are readable by clients that can read the state.
- True security therefore depends entirely on the Windows account running the local server and NTFS/SMB ACLs.

## ACL gap

The server's health response reports writability using the directory ReadOnly attribute, not an effective write test or ACL evaluation. The client does not enforce the returned writable flag. No separate Windows accounts or SMB share were supplied, so actual organizational role/ACL alignment is NOT TESTED.

## Decision

The in-app role system is a workflow convenience, not an authorization boundary. Under the supplied Master rules, this is a Critical finding and prevents GO until the product claims and deployment controls are aligned.

