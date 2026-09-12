package in.zygertechnology.zygererp.production.repository;

import in.zygertechnology.zygererp.production.entity.OperationExecutionEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

/**
 * PHASE 2 — Repository for the isolated {@code prod_operation_execution_event}
 * table. No legacy table / StockService dependency.
 */
public interface OperationExecutionEventRepository extends JpaRepository<OperationExecutionEvent, UUID> {
}
