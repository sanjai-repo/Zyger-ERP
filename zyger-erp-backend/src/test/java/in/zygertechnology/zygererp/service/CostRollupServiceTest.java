package in.zygertechnology.zygererp.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CostRollupServiceTest {

    @Mock private EntityManager em;
    @InjectMocks private CostRollupService costRollupService;

    @Nested
    @DisplayName("refresh()")
    class Refresh {
        @Test
        @DisplayName("Should refresh materialized view")
        void refreshView() {
            Query query = mock(Query.class);
            when(em.createNativeQuery(contains("REFRESH MATERIALIZED VIEW"))).thenReturn(query);

            costRollupService.refresh();

            verify(query).executeUpdate();
        }
    }

    @Nested
    @DisplayName("getCostSummary()")
    class CostSummary {
        @Test
        @SuppressWarnings("unchecked")
        @DisplayName("Should return cost summary for specific machine")
        void specificMachine() {
            Query query = mock(Query.class);
            lenient().when(em.createNativeQuery(anyString())).thenReturn(query);
            lenient().when(query.setParameter(anyString(), any())).thenReturn(query);

            Object[] row = new Object[]{"MCH-01", "2026-01", 3, 1500.0, 500.0, 2000.0, 4000.0, "PLANT-1"};
            List<Object[]> rows = new ArrayList<>();
            rows.add(row);
            when(query.getResultList()).thenReturn(rows);

            List<Map<String, Object>> result = costRollupService.getCostSummary("MCH-01", 6);

            assertEquals(1, result.size());
            assertEquals("MCH-01", result.get(0).get("machineCode"));
        }

        @Test
        @SuppressWarnings("unchecked")
        @DisplayName("Should return empty list when no data")
        void noData() {
            Query query = mock(Query.class);
            lenient().when(em.createNativeQuery(anyString())).thenReturn(query);
            lenient().when(query.setParameter(anyString(), any())).thenReturn(query);
            when(query.getResultList()).thenReturn(new ArrayList<>());

            List<Map<String, Object>> result = costRollupService.getCostSummary(null, 12);
            assertTrue(result.isEmpty());
        }
    }

    @Nested
    @DisplayName("getTcoSummary()")
    class TcoSummary {
        @Test
        @SuppressWarnings("unchecked")
        @DisplayName("Should return TCO summary for machine")
        void tcoForMachine() {
            Query query = mock(Query.class);
            lenient().when(em.createNativeQuery(anyString())).thenReturn(query);
            lenient().when(query.setParameter(anyString(), any())).thenReturn(query);

            Object[] row = new Object[]{"MCH-01", 5000.0, 3000.0, 8000.0, 12};
            List<Object[]> rows = new ArrayList<>();
            rows.add(row);
            when(query.getResultList()).thenReturn(rows);

            Map<String, Object> result = costRollupService.getTcoSummary("MCH-01");

            assertNotNull(result);
            assertEquals("MCH-01", result.get("machineCode"));
        }
    }
}
