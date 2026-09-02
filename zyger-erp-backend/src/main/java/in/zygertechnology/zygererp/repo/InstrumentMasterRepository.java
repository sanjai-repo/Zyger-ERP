package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface InstrumentMasterRepository extends JpaRepository<InstrumentMaster, Long> {
    Optional<InstrumentMaster> findByCode(String code);
    boolean existsByCode(String code);
    List<InstrumentMaster> findByActiveTrue();
    List<InstrumentMaster> findByCurrentStatus(String status);
}
