package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.DocStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocStatusHistoryRepository extends JpaRepository<DocStatusHistory, Long> {
    List<DocStatusHistory> findByDocTypeAndDocIdOrderByCreatedAtAsc(String docType, Long docId);
}
