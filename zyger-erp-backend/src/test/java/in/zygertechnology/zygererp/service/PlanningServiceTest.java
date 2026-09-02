package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.*;
import in.zygertechnology.zygererp.repo.*;
import in.zygertechnology.zygererp.repository.ResourceMasterRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlanningServiceTest {

    @Mock private DocumentFacade docs;
    @Mock private ProductionBOMRepository bomRepo;
    @Mock private RouteSheetRepository routeRepo;
    @Mock private BomRevisionHistoryRepository bomRevisionHistoryRepo;
    @Mock private jakarta.persistence.EntityManager em;
    @Mock private WorkOrderStatusHistoryRepository woStatusHistoryRepo;
    @Mock private ProcessMasterRepository processRepo;
    @Mock private ResourceMasterRepository resourceRepo;
    @Mock private DocStatusHistoryRepository docStatusHistoryRepo;
    @InjectMocks private PlanningService planningService;

    @Nested
    @DisplayName("isPlanning()")
    class IsPlanning {
        @Test
        @DisplayName("Should return true for known planning keys")
        void knownKeys() {
            assertTrue(planningService.isPlanning("production-bom"));
            assertTrue(planningService.isPlanning("route-sheet"));
            assertTrue(planningService.isPlanning("work-order"));
            assertTrue(planningService.isPlanning("shop-floor-entry"));
        }

        @Test
        @DisplayName("Should return false for non-planning keys")
        void unknownKeys() {
            assertFalse(planningService.isPlanning("purchase-order"));
            assertFalse(planningService.isPlanning("sales-order"));
            assertFalse(planningService.isPlanning(""));
        }
    }

    @Nested
    @DisplayName("update()")
    class Update {
        @Test
        @DisplayName("Should update production BOM via DocumentFacade")
        void updateBom() {
            ProductionBOM existing = new ProductionBOM();
            existing.setLines(new ArrayList<>());

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("description", "Updated BOM");

            when(docs.update("production-bom", 1L, body, "admin")).thenReturn(existing);

            DocEntity result = planningService.update("production-bom", 1L, body, "admin");
            assertNotNull(result);
            verify(docs).update("production-bom", 1L, body, "admin");
        }
    }

    @Nested
    @DisplayName("BOM Revision History")
    class BomRevision {
        @Test
        @DisplayName("Should get revision history for a BOM")
        void getRevisionHistory() {
            BomRevisionHistory h1 = BomRevisionHistory.builder()
                    .id(1L).bomId(10L).revisionNo(2).bomVersion("2.0")
                    .createdBy("admin").remarks("Updated materials").build();
            BomRevisionHistory h2 = BomRevisionHistory.builder()
                    .id(2L).bomId(10L).revisionNo(1).bomVersion("1.0")
                    .createdBy("admin").remarks("Initial revision").build();

            when(bomRevisionHistoryRepo.findByBomIdOrderByRevisionNoDesc(10L))
                    .thenReturn(List.of(h1, h2));

            List<Map<String, Object>> result = planningService.getBomRevisionHistory(10L);

            assertEquals(2, result.size());
            assertEquals(2, result.get(0).get("revisionNo"));
            assertEquals("2.0", result.get(0).get("bomVersion"));
        }

        @Test
        @DisplayName("Should return empty list for BOM with no history")
        void emptyHistory() {
            when(bomRevisionHistoryRepo.findByBomIdOrderByRevisionNoDesc(99L))
                    .thenReturn(Collections.emptyList());

            List<Map<String, Object>> result = planningService.getBomRevisionHistory(99L);
            assertTrue(result.isEmpty());
        }
    }
}
