package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "posting_idempotency_key")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class PostingIdempotencyKey {

    @Id
    @Column(name = "idempotency_key", length = 100, nullable = false)
    private String idempotencyKey;

    @Column(name = "entry_id", nullable = false)
    private Long entryId;

    @Column(name = "result_status", length = 15, nullable = false)
    private String resultStatus; // SUCCESS | FAILED

    @Column(name = "response_json", columnDefinition = "TEXT")
    private String responseJson;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
