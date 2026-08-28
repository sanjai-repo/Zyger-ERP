package in.zygertechnology.zygererp.repo;
import in.zygertechnology.zygererp.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {
    List<NotificationLog> findByRecipient(String recipient);
    List<NotificationLog> findBySourceTypeAndSourceId(String sourceType, Long sourceId);
    List<NotificationLog> findTop50ByRecipientOrderBySentAtDesc(String recipient);
}
