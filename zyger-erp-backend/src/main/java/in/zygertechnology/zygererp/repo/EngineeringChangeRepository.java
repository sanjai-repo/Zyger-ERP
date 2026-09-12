package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.EngineeringChange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EngineeringChangeRepository extends JpaRepository<EngineeringChange, Long> {
    Optional<EngineeringChange> findByEcrNumber(String ecrNumber);
    List<EngineeringChange> findByStatus(String status);
    List<EngineeringChange> findByItemCode(String itemCode);
}
