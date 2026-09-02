package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.MaterialReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MaterialReservationRepository extends JpaRepository<MaterialReservation, Long> {
    List<MaterialReservation> findByWorkOrderId(Long workOrderId);
    List<MaterialReservation> findByItemCode(String itemCode);
    List<MaterialReservation> findByStatus(String status);
}
