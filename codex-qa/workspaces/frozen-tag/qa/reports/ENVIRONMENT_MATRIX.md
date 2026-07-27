# Environment Matrix

| Dimension | Tested | Result / limitation |
|---|---|---|
| OS | Windows 11 Home build 26200, 64-bit | Tested |
| Edge | 150.0.4078.83 | Tested |
| Chrome | 150.0.7871.182 | Tested |
| Edge 95 | No | Not installed; NOT TESTED |
| Workstations | One physical host | Multiple isolated browsers/processes only |
| Shared storage | Local simulated shared directory | No real SMB/UNC server |
| Windows identities | Current user only | No separate real ACL role matrix |
| Network failure | Logical/unreachable-source scenarios | No physical cable/Wi-Fi/SMB interruption |
| Power failure | No | Atomic-write structure and malformed files tested; real power loss NOT TESTED |
| Internet access | Runtime external requests monitored | None observed in tested flows |

