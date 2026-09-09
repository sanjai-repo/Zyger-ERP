package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

/**
 * Immutable cross-document reference link by internal ID (DOCUMENT 02 v2.0 §03.2,
 * BR-INV-TRACE-2). Powers the Traceability Viewer without relying on display-number
 * strings, which can be renumbered or duplicated across years.
 */
@Entity
@Table(name = "doc_links", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"source_doc_id", "source_doc_type", "target_doc_id", "target_doc_type"})
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class DocLink {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @Column(name = "source_doc_id", nullable = false) Long sourceDocId;
    @Column(name = "source_doc_type", nullable = false, length = 60) String sourceDocType;
    @Column(name = "target_doc_id", nullable = false) Long targetDocId;
    @Column(name = "target_doc_type", nullable = false, length = 60) String targetDocType;

    Instant createdAt;
    String createdBy;
}
