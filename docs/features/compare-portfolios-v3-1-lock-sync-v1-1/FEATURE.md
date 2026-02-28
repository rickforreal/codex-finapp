# Compare Portfolios v3.1.1 — Sequential Spending Phase Instance Locks

## Problem Statement

Spending Phase instance-level locks allowed non-sequential combinations (for example, locking Phase 1 and Phase 3 but not Phase 2), which can create confusing gaps in follower slots.

## Goal

Retain Spending Phase instance-level lock controls while enforcing a sequential prefix invariant that prevents phase gaps.

## Scope

In scope:
- Enforce contiguous-prefix lock rule for Spending Phase instance locks.
- Cascade unlock from selected phase through later phases.
- Keep Income/Expense instance-lock behavior unchanged.

Out of scope:
- New API contracts.
- New snapshot schema version.

## Canonical Docs Impact

Expected updates:
- `docs/SPECS.md`
- `docs/SCENARIOS.md`
- `docs/DATA_MODEL.md`
- `docs/ARCHITECTURE.md`
