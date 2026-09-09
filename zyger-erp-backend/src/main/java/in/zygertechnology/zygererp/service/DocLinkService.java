package in.zygertechnology.zygererp.service;

import in.zygertechnology.zygererp.entity.DocLink;
import in.zygertechnology.zygererp.repo.DocLinkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Records and reads cross-document reference links (DOCUMENT 02 v2.0 §03.2/03.3).
 * Deliberately has no dependency on DocumentFacade — it only ever writes/reads the
 * doc_links table by internal ID; resolving a link into display data is the
 * caller's job (see TraceabilityInventoryController), which keeps this service
 * free of circular-dependency risk with DocumentFacade.
 */
@Service
public class DocLinkService {

    private final DocLinkRepository repo;

    public DocLinkService(DocLinkRepository repo) {
        this.repo = repo;
    }

    /** Idempotent: records the link once, silently no-ops if it already exists or either id is null. */
    @Transactional
    public void record(String sourceType, Long sourceId, String targetType, Long targetId, String user) {
        if (sourceId == null || targetId == null || sourceType == null || targetType == null) return;
        if (repo.existsBySourceDocIdAndSourceDocTypeAndTargetDocIdAndTargetDocType(
                sourceId, sourceType, targetId, targetType)) {
            return;
        }
        repo.save(DocLink.builder()
                .sourceDocId(sourceId).sourceDocType(sourceType)
                .targetDocId(targetId).targetDocType(targetType)
                .createdAt(Instant.now()).createdBy(user)
                .build());
    }

    public List<DocLink> linksFrom(String docType, Long docId) {
        return repo.findBySourceDocIdAndSourceDocType(docId, docType);
    }

    public List<DocLink> linksTo(String docType, Long docId) {
        return repo.findByTargetDocIdAndTargetDocType(docId, docType);
    }
}
