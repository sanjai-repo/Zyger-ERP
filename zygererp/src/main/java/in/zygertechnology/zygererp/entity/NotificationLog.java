package in.zygertechnology.zygererp.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "notification_log", indexes = {
    @Index(name = "idx_nl_recipient", columnList = "recipient"),
    @Index(name = "idx_nl_source", columnList = "source_type, source_id"),
    @Index(name = "idx_nl_created", columnList = "sent_at")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;
    @Column(name = "recipient", length = 100) String recipient;
    @Column(name = "channel", length = 20) String channel;  // EMAIL, SMS, IN_APP, WHATSAPP
    @Column(name = "subject", length = 255) String subject;
    @Column(name = "body", columnDefinition = "TEXT") String body;
    @Column(name = "source_type", length = 30) String sourceType;
    @Column(name = "source_id") Long sourceId;
    @Column(name = "status", length = 20) @Builder.Default String status = "SENT";
    @Column(name = "sent_at") Instant sentAt = Instant.now();
    @Column(name = "read_at") Instant readAt;
    @Column(name = "error_message", length = 500) String errorMessage;
}
