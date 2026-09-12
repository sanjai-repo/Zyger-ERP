package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.PmChecklistTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PmChecklistTemplateRepository extends JpaRepository<PmChecklistTemplate, Long> {
    List<PmChecklistTemplate> findByActiveTrue();
}
