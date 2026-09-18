package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.EcrRiskLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EcrRiskLineRepository extends JpaRepository<EcrRiskLine, Long> {
    List<EcrRiskLine> findByEngineeringChangeId(Long engineeringChangeId);
}
