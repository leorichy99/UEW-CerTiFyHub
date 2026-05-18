# Sprint Backlog - Architectural Improvements

## Completed (Sprint 0 - Foundation)

**Week 1: Infrastructure Foundation**
- ✅ Slice 18: Test infrastructure structure
- ✅ Slice 12: React Query infrastructure
- ✅ Slice 8: HistoryManager class
- ✅ Documentation: tests/README.md, hooks/README.md

## Sprint 1: Test Surface & Editor History (2 weeks)

**Goal**: Establish test infrastructure and complete editor history module

**Week 1:**
- Slice 19: Add model fixtures and factories
- Slice 20: Add API fixtures and MSW handlers
- Slice 21: Add test utilities and custom client

**Week 2:**
- Slice 22: Migrate one test file to new infrastructure
- Slice 9: Create useEditorHistory React hook
- Slice 10: Add tests for Editor History module
- Slice 11: Integrate hook into EditorContext

**Deliverables:**
- Working test infrastructure with fixtures, factories, mocks
- Editor history module fully integrated with tests
- One test file migrated as reference pattern

---

## Sprint 2: API Hooks & Certificate Rendering (3 weeks)

**Goal**: Complete API hooks module and start certificate rendering extraction

**Week 1:**
- Slice 13: Create useApiQuery hook
- Slice 14: Create useApiMutation hook
- Slice 15: Add tests for API hooks

**Week 2:**
- Slice 16: Create useDashboardStats wrapper
- Slice 17: Migrate DashboardPage to use hooks
- Slice 1: Extract common rendering utilities

**Week 3:**
- Slice 2: Create PDF renderer adapter
- Slice 3: Create PNG renderer adapter
- Slice 4: Create CertificateRenderingService

**Deliverables:**
- Generic API hooks with tests
- Dashboard migrated to new hooks
- Certificate rendering adapters and service created

---

## Sprint 3: Certificate Rendering Integration (2 weeks)

**Goal**: Complete certificate rendering module integration

**Week 1:**
- Slice 5: Add tests for rendering module
- Slice 6: Migrate get_preview to use service (strangler)
- Slice 7: Migrate generate_pdf_for_certificate to use service

**Week 2:**
- Remove old rendering code from ViewSet
- Performance testing and optimization
- Documentation updates

**Deliverables:**
- Certificate rendering fully extracted and tested
- ViewSet cleaned up
- PDF/PNG generation working via service layer

---

## Sprint 4: Account Lifecycle (2 weeks)

**Goal**: Extract account lifecycle service

**Week 1:**
- Slice 23: Create repository classes
- Slice 24: Create AccountLifecycleService
- Slice 25: Create TwoPersonDeactivationService

**Week 2:**
- Slice 26: Add tests for Account Lifecycle Service
- Slice 27: Migrate AccountListCreateView to use service

**Deliverables:**
- Account lifecycle service with repositories
- Two-person deactivation service
- Account provisioning migrated to service

---

## Sprint 5: Authorization Policy (2 weeks)

**Goal**: Extract authorization policy module

**Week 1:**
- Slice 28: Create AuthorizationService with rule registration
- Slice 29: Migrate IsSuperAdmin permission class
- Slice 30: Add tests for Authorization Policy Module

**Week 2:**
- Slice 31: Migrate remaining permission classes
- Remove old permission logic
- Documentation updates

**Deliverables:**
- Centralized authorization service
- All permission classes migrated
- Rule registration system in place

---

## Sprint 6: Final Integration & Polish (1 week)

**Goal**: Complete remaining migrations and polish

**Week 1:**
- Migrate remaining Account Lifecycle views (deactivate, reactivate, unlock, regenerate)
- Final integration testing
- Performance profiling
- Documentation completion
- ADR updates

**Deliverables:**
- All architectural improvements complete
- Comprehensive documentation
- ADRs for major decisions
- Performance benchmarks

---

## Summary

- **Total Duration**: 10 weeks (5 sprints of 2-3 weeks each)
- **Total Slices**: 31 slices
- **Completed**: 3 slices (foundation)
- **Remaining**: 28 slices
- **Average Velocity**: ~3 slices per week

## Dependencies

Sprint 1 can start immediately (Sprint 0 complete).
Sprint 2 depends on Sprint 1 completion (test infrastructure needed for hooks tests).
Sprint 3 depends on Sprint 2 completion (hooks needed for Dashboard migration).
Sprint 4 can run in parallel with Sprint 2-3 (independent module).
Sprint 5 can run in parallel with Sprint 3-4 (independent module).
Sprint 6 depends on all previous sprints.

## Risk Mitigation

- **Strangler pattern**: Each migration keeps old code as fallback, reducing risk
- **Test coverage**: Each slice includes tests, preventing regressions
- **Incremental delivery**: Each sprint delivers working features
- **Parallel work**: Independent modules can be worked on in parallel
