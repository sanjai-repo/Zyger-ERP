package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.NumberingConfig;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NumberingConfigRepository extends JpaRepository<NumberingConfig, Long> {

    Optional<NumberingConfig> findByDocType(String docType);

    List<NumberingConfig> findByActiveTrue();
}
