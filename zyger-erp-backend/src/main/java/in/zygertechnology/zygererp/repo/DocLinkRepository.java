package in.zygertechnology.zygererp.repo;

import in.zygertechnology.zygererp.entity.DocLink;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DocLinkRepository extends JpaRepository<DocLink, Long> {
    boolean existsBySourceDocIdAndSourceDocTypeAndTargetDocIdAndTargetDocType(
            Long sourceDocId, String sourceDocType, Long targetDocId, String targetDocType);

    List<DocLink> findBySourceDocIdAndSourceDocType(Long sourceDocId, String sourceDocType);

    List<DocLink> findByTargetDocIdAndTargetDocType(Long targetDocId, String targetDocType);
}
