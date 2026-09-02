package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.PmCompletionPart;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PmCompletionPartRepository extends JpaRepository<PmCompletionPart, Long> {
    List<PmCompletionPart> findByCompletionId(Long completionId);
}
