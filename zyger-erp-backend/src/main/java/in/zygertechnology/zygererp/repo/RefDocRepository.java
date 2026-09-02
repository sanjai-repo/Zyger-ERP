package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.RefDoc;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RefDocRepository extends JpaRepository<RefDoc, Long> {
    List<RefDoc> findByKind(String kind);
}
