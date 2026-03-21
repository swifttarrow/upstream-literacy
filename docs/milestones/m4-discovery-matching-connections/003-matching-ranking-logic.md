# Task 003: Matching Ranking Logic

## Goal

Implement app-layer ranking heuristic: primary problem match > secondary > district similarity. Assign matchType (exact | close) and generate explanation text. Deterministic, explainable. Cold-start: broaden criteria when exact matches scarce; include is_demo_profile when configured.

## Deliverables

- [ ] Ranking logic: primary problem exact match = exact; secondary or district similarity = close (or refined rules)
- [ ] matchType in response: "exact" | "close"
- [ ] explanation: short text explaining why matched (e.g. "Both focused on K-3 reading intervention")
- [ ] Cold start: when few exact matches, include close matches; surface is_demo_profile in response for labeling
- [ ] Deterministic ordering (e.g. by score desc, id asc)

## Notes

- No ML; rule-based heuristic per plan
- Explanation computed at query time, not persisted

## Verification

```bash
# With diverse data: verify exact vs close labeling
# With sparse data: verify close matches and demo profiles appear
```
