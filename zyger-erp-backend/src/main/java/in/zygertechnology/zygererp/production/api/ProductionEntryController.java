package in.zygertechnology.zygererp.production.api;

import in.zygertechnology.zygererp.production.dto.ProductionEntryDTO;
import in.zygertechnology.zygererp.production.entity.OperationExecutionEvent;
import in.zygertechnology.zygererp.production.service.ProductionEntryApplicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * PHASE 1 — Isolated Production Entry API stub (Task 5).
 *
 * <p>SAFE STUB ONLY:
 * <ul>
 *   <li>Lives in its own {@code production.api} package under a distinct stub
 *       path to avoid colliding with the committed
 *       {@code controller.ProductionController}'s existing
 *       {@code /api/v1/production/entries} endpoints.</li>
 *   <li>Injects a single isolated application service that persists to the NEW
 *       {@code prod_operation_execution_event} table (V6). It touches NO legacy
 *       tables and NO {@code StockService}.</li>
 * </ul>
 *
 * <p>Purpose: prove the API transport layer and type mapping work safely.</p>
 *
 * <p>F10: gated behind the {@code stub} Spring profile so the Phase-1 stub is no
 * longer live on any normal runtime (default dev/staging/prod). It is only mounted
 * when the environment is explicitly started with {@code --spring.profiles.active=stub};
 * frontend wiring to the stub has been removed.</p>
 */
@Slf4j
@RequiredArgsConstructor
@Profile("stub")
@RestController
@RequestMapping("/api/v1/production/entries-stub")
public class ProductionEntryController {

    private final ProductionEntryApplicationService service;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createProductionEntry(@RequestBody ProductionEntryDTO dto) {
        // Log only safe identifiers, never the full payload (operator/supervisor/batch/item
        // data must not be written to application logs).
        log.info("PHASE 2 received ProductionEntryDTO workOrderNumber={}, operationId={}, id={}",
                dto != null ? dto.getWorkOrderNumber() : null,
                dto != null ? dto.getOperationId() : null,
                dto != null ? dto.getId() : null);
        OperationExecutionEvent saved = service.createEntry(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "status", "CREATED",
                "message", "Production entry persisted to prod_operation_execution_event.",
                "id", saved.getId() != null ? saved.getId().toString() : null));
    }
}
