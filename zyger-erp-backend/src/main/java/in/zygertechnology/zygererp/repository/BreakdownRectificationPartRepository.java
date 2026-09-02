package in.zygertechnology.zygererp.repository;

import in.zygertechnology.zygererp.entity.BreakdownRectificationPart;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BreakdownRectificationPartRepository extends JpaRepository<BreakdownRectificationPart, Long> {
    List<BreakdownRectificationPart> findByRectificationId(Long rectificationId);
}
