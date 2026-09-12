package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.PmCompletionChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface PmCompletionChecklistItemRepository extends JpaRepository<PmCompletionChecklistItem, Long> {
    List<PmCompletionChecklistItem> findByCompletionId(Long completionId);
}
