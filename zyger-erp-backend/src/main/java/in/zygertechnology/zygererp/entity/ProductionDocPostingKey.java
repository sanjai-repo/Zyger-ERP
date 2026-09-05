package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * P9 — Idempotency key for disposition-document POSTs (X-Idempotency-Key mechanism,
 * mirroring {@code posting_idempotency_key} for Production Entries).
 */
@Entity
@Table(name = "production_doc_posting_key")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductionDocPostingKey {

    @Id
    @Column(name = "idempotency_key", length = 100, nullable = false)
    private String idempotencyKey;

    @Column(name = "doc_family", length = 20, nullable = false)
    private String docFamily;

    @Column(name = "doc_id", nullable = false)
    private Long docId;

    @Column(name = "result_status", length = 15, nullable = false)
    private String resultStatus;

    @Column(name = "response_json", columnDefinition = "TEXT")
    private String responseJson;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}