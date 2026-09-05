package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.ProductionGateOverrideAuditRepository;
import in.zygertechnology.zygererp.repo.ProductionGateOverrideRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * P11 — Unit tests for {@link ProductionQualityGateService} (DOCUMENT_61, CLAR-PROD-012):
 * gate status mapping, blocking at entry post + subjob completion, one-time approved-cover
 * consumption, override request/signature authority (role-enforced), mandatory reason,
 * idempotency, and audit recording. Recording-only: gate never touches stock/WIP/entry qty.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ProductionQualityGateServiceTest {

    @Mock private EntityManager em;
    @Mock private ProductionGateOverrideRepository overrides;
    @Mock private ProductionGateOverrideAuditRepository auditRepo;

    @InjectMocks
    private ProductionQualityGateService service;

    private TypedQuery<QualityInspection> inspectQuery;

    @AfterEach
    void tearDown() { SecurityContextHolder.clearContext(); }

    private void grant(String... roles) {
        List<GrantedAuthority> ga = java.util.Arrays.stream(roles)
                .map(r -> (GrantedAuthority) () -> "ROLE_" + r)
                .toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("ws@test", null, ga));
    }

    private void stubInspections(List<QualityInspection> list) {
        @SuppressWarnings("unchecked")
        TypedQuery<QualityInspection> q = mock(TypedQuery.class);
        when(em.createQuery(anyString(), eq(QualityInspection.class))).thenReturn(q);
        when(q.setParameter(anyString(), any())).thenReturn(q);
        when(q.getResultList()).thenReturn(list);
    }

    private QualityInspection inspection(Long id, String docNo, String status) {
        QualityInspection qi = new QualityInspection();
        qi.setId(id);
        qi.setDocNo(docNo);
        qi.setSourceType("PRODUCTION");
        qi.setSourceNumber("JC-100");
        qi.setOperation("OP-10");
        qi.setItemCode("IT-PC-01");
        qi.setInspectionStatus(status);
        return qi;
    }

    private ProductionEntry entry() {
        return ProductionEntry.builder()
                .id(1L)
                .entryNumber("PE-1")
                .status("SUBMITTED")
                .jobCardNumber("JC-100")
                .operationCode("OP-10")
                .build();
    }

    private JobCardSubjob subjob(String op) {
        JobCard jc = new JobCard();
        jc.setJobCardNumber("JC-100");
        JobCardSubjob sj = new JobCardSubjob();
        sj.setJobCard(jc);
        sj.setSubjobNumber("SJ-1");
        sj.setOperationCode(op);
        return sj;
    }

    private void stubActiveOverride(QualityInspection qi, String status) {
        ProductionGateOverride ovr = status == null ? null : ProductionGateOverride.builder()
                .id(1L)
                .inspectionId(qi.getId())
                .inspectionNumber(qi.getDocNo())
                .jobCardNumber("JC-100")
                .itemCode("IT-PC-01")
                .reason("mandatory reason")
                .status(status)
                .build();
        when(overrides.findFirstByInspectionIdAndStatusInOrderByIdAsc(eq(qi.getId()), anyList()))
                .thenReturn(Optional.ofNullable(ovr));
    }

    private void stubOverrideById(String status) {
        when(overrides.findById(1L)).thenReturn(Optional.of(ProductionGateOverride.builder()
                .id(1L)
                .inspectionId(1L)
                .inspectionNumber("QC-1")
                .jobCardNumber("JC-100")
                .itemCode("IT-PC-01")
                .reason("r")
                .status(status)
                .build()));
    }

    private void stubSaveReturnsArg() {
        when(overrides.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    // ------------------------------------------------------------------
    // 1. Gate status mapping
    // ------------------------------------------------------------------

    @Test
    @DisplayName("isBlocking maps PENDING/FAIL/HELD as blocking, PASS/APPROVED/CLOSED/cancelled as clear")
    void statusMapping() {
        assertTrue(service.isBlocking("DRAFT"));
        assertTrue(service.isBlocking("PENDING"));
        assertTrue(service.isBlocking("ASSIGNED"));
        assertTrue(service.isBlocking("IN_PROGRESS"));
        assertTrue(service.isBlocking("SUBMITTED"));
        assertTrue(service.isBlocking("FAIL"));
        assertTrue(service.isBlocking("HOLD"));
        assertFalse(service.isBlocking("PASS"));
        assertFalse(service.isBlocking("APPROVED"));
        assertFalse(service.isBlocking("CLOSED"));
        assertFalse(service.isBlocking("CANCELLED"));
        assertFalse(service.isBlocking(null));
    }

    // ------------------------------------------------------------------
    // 2. findBlockingInspections — operation scoping
    // ------------------------------------------------------------------

    @Test
    @DisplayName("findBlockingInspections includes matching-op and jobcard-level inspections, excludes other ops")
    void blockingLookup() {
        stubInspections(List.of(
                inspection(1L, "QC-1", "SUBMITTED"),
                inspection(2L, "QC-2", "FAIL"),
                inspection(3L, "QC-3", "PASS")));
        List<QualityInspection> blocked = service.findBlockingInspections("JC-100", "OP-10");
        assertTrue(blocked.stream().map(QualityInspection::getDocNo).anyMatch("QC-1"::equals));
        assertTrue(blocked.stream().map(QualityInspection::getDocNo).anyMatch("QC-2"::equals));
        assertFalse(blocked.stream().map(QualityInspection::getDocNo).anyMatch("QC-3"::equals));
    }

    @Test
    @DisplayName("findBlockingInspections excludes inspections tied to a different operation code")
    void blockingLookupDifferentOp() {
        stubInspections(List.of(inspection(1L, "QC-1", "HOLD")));
        assertTrue(service.findBlockingInspections("JC-100", "OP-99").isEmpty());
    }

    // ------------------------------------------------------------------
    // 3. Entry post gate
    // ------------------------------------------------------------------

    @Test
    @DisplayName("entry post is blocked when a blocking inspection exists without override")
    void entryPostBlocked() {
        stubInspections(List.of(inspection(1L, "QC-1", "SUBMITTED")));
        stubActiveOverride(inspection(1L, "QC-1", "SUBMITTED"), null);
        assertThrows(IllegalArgumentException.class, () -> service.assertEntryPostGate(entry(), "u@test"));
    }

    @Test
    @DisplayName("entry post passes when inspection has cleared to PASS")
    void entryPostPassesWhenCleared() {
        stubInspections(List.of(inspection(1L, "QC-1", "PASS")));
        assertDoesNotThrow(() -> service.assertEntryPostGate(entry(), "u@test"));
    }

    @Test
    @DisplayName("entry post passes when no inspection exists (gate is status-driven, not auto-creating)")
    void entryPostPassesWithoutInspection() {
        stubInspections(List.of());
        assertDoesNotThrow(() -> service.assertEntryPostGate(entry(), "u@test"));
    }

    // ------------------------------------------------------------------
    // 4. Subjob completion gate
    // ------------------------------------------------------------------

    @Test
    @DisplayName("subjob completion is blocked when a blocking inspection exists without override")
    void subjobCompleteBlocked() {
        stubInspections(List.of(inspection(1L, "QC-1", "FAIL")));
        stubActiveOverride(inspection(1L, "QC-1", "FAIL"), null);
        assertThrows(IllegalArgumentException.class, () -> service.assertSubjobGate(subjob("OP-10"), "u@test"));
    }

    @Test
    @DisplayName("subjob completion passes when the gate is clear")
    void subjobCompletePasses() {
        stubInspections(List.of(inspection(1L, "QC-1", "APPROVED")));
        assertDoesNotThrow(() -> service.assertSubjobGate(subjob("OP-10"), "u@test"));
    }

    // ------------------------------------------------------------------
    // 5. Override request
    // ------------------------------------------------------------------

    @Test
    @DisplayName("override request requires a real PRODUCTION-sourced blocking inspection")
    void requestRequiresBlockingInspection() {
        stubInspections(List.of());
        when(em.find(QualityInspection.class, 1L)).thenReturn(null);
        Map<String, Object> body = validBody();
        assertThrows(IllegalArgumentException.class, () -> service.requestOverride(body, "op@test"));
    }

    @Test
    @DisplayName("override request refuses non-PRODUCTION-sourced inspection")
    void requestRefusesNonProductionSource() {
        QualityInspection qi = inspection(1L, "QC-1", "SUBMITTED");
        qi.setSourceType("PO_INWARD");
        when(em.find(QualityInspection.class, 1L)).thenReturn(qi);
        assertThrows(IllegalArgumentException.class, () -> service.requestOverride(validBody(), "op@test"));
    }

    @Test
    @DisplayName("override request rejects a non-blocking inspection")
    void requestRejectsClearInspection() {
        QualityInspection qi = inspection(1L, "QC-1", "PASS");
        when(em.find(QualityInspection.class, 1L)).thenReturn(qi);
        assertThrows(IllegalArgumentException.class, () -> service.requestOverride(validBody(), "op@test"));
    }

    @Test
    @DisplayName("override request requires a mandatory reason")
    void requestRequiresReason() {
        QualityInspection qi = inspection(1L, "QC-1", "HOLD");
        when(em.find(QualityInspection.class, 1L)).thenReturn(qi);
        Map<String, Object> body = validBody();
        body.put("reason", "   ");
        assertThrows(IllegalArgumentException.class, () -> service.requestOverride(body, "op@test"));
    }

    @Test
    @DisplayName("override request rejects non-positive quantity")
    void requestRejectsBadQuantity() {
        QualityInspection qi = inspection(1L, "QC-1", "HOLD");
        when(em.find(QualityInspection.class, 1L)).thenReturn(qi);
        Map<String, Object> body = validBody();
        body.put("quantity", BigDecimal.ZERO);
        assertThrows(IllegalArgumentException.class, () -> service.requestOverride(body, "op@test"));
    }

    @Test
    @DisplayName("override request succeeds and records CREATE_REQUEST audit")
    void requestSuccess() {
        QualityInspection qi = inspection(1L, "QC-1", "HOLD");
        when(em.find(QualityInspection.class, 1L)).thenReturn(qi);
        when(overrides.saveAndFlush(any())).thenAnswer(inv -> {
            ProductionGateOverride o = inv.getArgument(0);
            if (o.getId() == null) o.setId(1L);
            return o;
        });
        ProductionGateOverride ovr = service.requestOverride(validBody(), "op@test");
        assertEquals(1L, ovr.getId());
        assertEquals("PENDING", ovr.getStatus());
        assertEquals("mandatory reason", ovr.getReason());
        assertEquals(ovr.getInspectionId(), qi.getId());
        verify(auditRepo).save(argThat(a -> "CREATE_REQUEST".equals(a.getEventType())));
    }

    @Test
    @DisplayName("duplicate override request returns the existing active override (idempotent)")
    void requestIdempotent() {
        QualityInspection qi = inspection(1L, "QC-1", "HOLD");
        when(em.find(QualityInspection.class, 1L)).thenReturn(qi);
        stubActiveOverride(qi, "PENDING");
        ProductionGateOverride ovr = service.requestOverride(validBody(), "op@test");
        assertEquals(1L, ovr.getId());
        verify(overrides, never()).saveAndFlush(any());
    }

    private Map<String, Object> validBody() {
        return new java.util.LinkedHashMap<>(Map.of(
                "inspectionId", 1L,
                "jobCardNumber", "JC-100",
                "operationCode", "OP-10",
                "itemCode", "IT-PC-01",
                "quantity", new BigDecimal("10"),
                "reason", "mandatory reason"));
    }

    // ------------------------------------------------------------------
    // 6. Signature authority
    // ------------------------------------------------------------------

    @Test
    @DisplayName("signQuality requires the Quality Manager role")
    void signQualityRoleGuard() {
        grant("PRODUCTION_SUPERVISOR");
        stubActiveOverride(inspection(1L, "QC-1", "SUBMITTED"), "PENDING");
        stubOverrideById("PENDING");
        assertThrows(SecurityException.class, () -> service.signQuality(1L, "q@test"));
    }

    @Test
    @DisplayName("joint approval needs Quality + Production signatures; both present → APPROVED")
    void jointSignaturesApproved() {
        grant("QUALITY_MANAGER");
        stubActiveOverride(inspection(1L, "QC-1", "SUBMITTED"), "PENDING");
        stubOverrideById("PENDING");
        stubSaveReturnsArg();
        ProductionGateOverride afterQ = service.signQuality(1L, "qm@test");
        assertEquals("PENDING", afterQ.getStatus());
        assertEquals("qm@test", afterQ.getQualityApproverUser());

        SecurityContextHolder.clearContext();
        grant("PRODUCTION_SUPERVISOR");
        ProductionGateOverride afterP = service.signProduction(1L, "pm@test");
        assertEquals("APPROVED", afterP.getStatus());
        assertEquals("pm@test", afterP.getProductionApproverUser());
        verify(auditRepo).save(argThat(a -> "APPROVED".equals(a.getEventType())));
    }

    @Test
    @DisplayName("joint sign by the same user in both roles is refused")
    void jointDistinctUsers() {
        grant("QUALITY_MANAGER", "PRODUCTION_SUPERVISOR");
        stubActiveOverride(inspection(1L, "QC-1", "SUBMITTED"), "PENDING");
        stubOverrideById("PENDING");
        stubSaveReturnsArg();
        service.signQuality(1L, "same@test");
        assertThrows(IllegalArgumentException.class, () -> service.signProduction(1L, "same@test"));
    }

    @Test
    @DisplayName("Plant Head single signature approves the override and flips category")
    void plantHeadSignature() {
        grant("PLANT_HEAD");
        stubActiveOverride(inspection(1L, "QC-1", "SUBMITTED"), "PENDING");
        stubOverrideById("PENDING");
        stubSaveReturnsArg();
        ProductionGateOverride ovr = service.signPlantHead(1L, "ph@test");
        assertEquals("APPROVED", ovr.getStatus());
        assertEquals("PLANT_HEAD", ovr.getCategory());
        assertEquals("ph@test", ovr.getPlantHeadApproverUser());
    }

    @Test
    @DisplayName("signing an already applied (one-time) override is refused")
    void signAppliedRefused() {
        grant("PLANT_HEAD");
        stubActiveOverride(inspection(1L, "QC-1", "SUBMITTED"), "APPLIED");
        stubOverrideById("APPLIED");
        assertThrows(IllegalArgumentException.class, () -> service.signPlantHead(1L, "ph@test"));
    }

    // ------------------------------------------------------------------
    // 7. One-time consumption
    // ------------------------------------------------------------------

    @Test
    @DisplayName("approved override is consumed exactly once clearing the gate, then next attempt is blocked again")
    void oneTimeConsumption() {
        QualityInspection qi = inspection(1L, "QC-1", "SUBMITTED");
        stubInspections(List.of(qi));
        // repository discipline: APPROVED override present first, consumed, then nothing.
        when(overrides.findFirstByInspectionIdAndStatusInOrderByIdAsc(eq(1L), anyList()))
                .thenReturn(Optional.of(ProductionGateOverride.builder()
                        .id(7L).inspectionId(1L).inspectionNumber("QC-1")
                        .jobCardNumber("JC-100").itemCode("IT-PC-01")
                        .reason("r").status("APPROVED").build()))
                .thenReturn(Optional.empty());
        when(overrides.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertDoesNotThrow(() -> service.assertEntryPostGate(entry(), "u@test"));
        verify(overrides).save(argThat(o -> "APPLIED".equals(o.getStatus()) && o.getAppliedByUser() != null));
        verify(auditRepo).save(argThat(a -> "APPLIED".equals(a.getEventType())));

        // Second evaluation: override consumed → gate re-blocks (one-time per contract).
        assertThrows(IllegalArgumentException.class, () -> service.assertEntryPostGate(entry(), "u@test"));
    }

    @Test
    @DisplayName("a PENDING override does not clear the gate (must be fully approved)")
    void pendingOverrideDoesNotClear() {
        stubInspections(List.of(inspection(1L, "QC-1", "SUBMITTED")));
        stubActiveOverride(inspection(1L, "QC-1", "SUBMITTED"), "PENDING");
        assertThrows(IllegalArgumentException.class, () -> service.assertEntryPostGate(entry(), "u@test"));
    }

    // ------------------------------------------------------------------
    // 8. Status read never consumes
    // ------------------------------------------------------------------

    @Test
    @DisplayName("evaluateGate (UI read) reports override availability without consuming it")
    void statusReadDoesNotConsume() {
        QualityInspection qi = inspection(1L, "QC-1", "SUBMITTED");
        stubInspections(List.of(qi));
        stubActiveOverride(qi, "APPROVED");
        when(overrides.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> gate = service.evaluateGate("JC-100", "OP-10", "system");
        assertEquals("CLEAR", gate.get("status"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> blockers = (List<Map<String, Object>>) gate.get("blockers");
        assertTrue((Boolean) blockers.get(0).get("overrideAvailable"));
        verify(overrides, never()).save(any());
    }
}