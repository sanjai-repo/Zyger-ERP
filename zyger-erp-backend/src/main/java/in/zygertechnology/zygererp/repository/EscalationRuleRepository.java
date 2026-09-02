package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.EscalationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EscalationRuleRepository extends JpaRepository<EscalationRule, Long> {
    List<EscalationRule> findByDocKeyAndActiveTrue(String docKey);
}
